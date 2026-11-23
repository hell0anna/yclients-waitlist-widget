const widget = document.querySelector('#widget');
const dialog = document.querySelector('#dialog');
const services = [
  { name: 'Маникюр с покрытием', minutes: 100, price: 2300, photo: 'manicure', note: 'Быстро и эффектно', prepaid: true },
  { name: 'Стрижка и укладка', minutes: 40, price: 2300, photo: 'styling', note: 'Уход и укладка' },
];
const staff = [
  { name: 'Евгений', role: 'Мастер маникюра', photo: 'evgeny', reviews: 625, available: true },
  { name: 'Михаил', role: 'Мастер маникюра', photo: 'mikhail', reviews: 5, available: true },
  { name: 'Мария Воробьева', role: 'Старший nail-мастер', photo: 'maria', reviews: 25, available: false },
];
staff.push({ name: 'Елена Шишкова', role: 'Старший nail-мастер', photo: 'elena', reviews: 25, available: true });
const bookingSlots = [
  ['Утро', ['08:30', '08:35', '08:40', '08:45', '08:50', '08:55', '09:00', '09:30']],
  ['День', ['12:30', '12:35', '12:40', '12:45', '12:50']],
  ['Вечер', ['17:30', '19:35', '21:40', '21:45']],
];
const times = ['Любое время', 'Утро', 'День', 'Вечер', 'Точное время'];
const timePresets = { 1: ['06:00', '11:55'], 2: ['12:00', '17:55'], 3: ['18:00', '23:55'] };
const today = new Date();
const dateKey = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()]
  .map(number => String(number).padStart(2, '0')).join('-');
const todayKey = dateKey(today);
const russianDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });
const months = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('ru', { month: 'long' }).format(new Date(2026, month, 1)));
const money = amount => new Intl.NumberFormat('ru').format(amount) + ' ₽';
const duration = minutes => [Math.floor(minutes / 60) && Math.floor(minutes / 60) + ' ч', minutes % 60 && minutes % 60 + ' мин'].filter(Boolean).join(' ');
const pluralServices = count => count === 1 ? '1 услуга' : count + ' услуги';
const blankDate = () => ({ start: '', end: '', mode: 'single', time: 0, exact: '', from: '', to: '' });
const blankRequest = () => ({ staff: [], services: [], dates: [], name: '', phone: '', email: '', comment: '', consent: false, updates: false });
let request = blankRequest();
let booking = blankRequest();
let entry = '';
let screen = 'home';
let queue = [];
let step = 0;
let choosing = [];
let dateDraft = blankDate();
let editing = null;
let month = today.getMonth();
let year = today.getFullYear();
let search = '';
let slotsPerson = null;
let submitted = false;
let rescheduling = false;
let schedulePerson = null;
let scheduleAll = false;
let showOtherTimes = false;
let calendarOpen = true;
let waitBack = 'booking-staff';
let preferredDay = '';
let activeSpecialist = 0;
let bookingLayer = null;
let slide = null;

const paths = {
  back: 'M15 6l-6 6 6 6', next: 'M9 6l6 6-6 6', close: 'M6 6l12 12M18 6 6 18',
  down: 'm7 10 5 5 5-5', plus: 'M12 5v14M5 12h14', check: 'm5 12 4 4L19 6',
  calendar: 'M4 6h16v14H4zM8 3v6m8-6v6M4 11h16',
  people: 'M16 20v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m17 0v-2a4 4 0 0 0-3-4M14 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm3-4a4 4 0 0 1 0 8',
  list: 'M8 5h12M8 12h12M8 19h12M4 5h.01M4 12h.01M4 19h.01',
  bell: 'M18 9a6 6 0 1 0-12 0c0 6-2 6-2 8h16c0-2-2-2-2-8m-8 11a2 2 0 0 0 4 0',
  user: 'M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2m-4-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  info: 'M12 11v5m0-8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  edit: 'm4 20 4-1L20 7l-3-3L5 16zM15 6l3 3',
  move: 'M5 20v-7a5 5 0 0 1 5-5h10m-5-5 5 5-5 5',
  card: 'M5 5h16v11H5zM2 8v11h16m-8-8a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
};
const icon = name => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="' + paths[name] + '"/></svg>';
const iconButton = (action, symbol, label) => '<button type="button" class="icon" data-action="' + action + '" aria-label="' + label + '">' + icon(symbol) + '</button>';
const image = (name, cls = 'avatar') => '<img class="' + cls + '" src="assets/' + name + '.png" alt="">';
const button = (action, label, cls = 'primary', extra = '') => '<button type="button" class="' + cls + '" data-action="' + action + '" ' + extra + '>' + label + '</button>';
const safe = value => String(value).replace(/[&<>"']/g, symbol => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[symbol]);
const salon = '<div class="grow"><strong>Beauty Nails Bar Pro</strong><small>Москва, пр-т Мира дом 211</small></div>';

function dateHeading({ start, end }, withYear = false) {
  if (!start) return '';
  const first = new Date(start + 'T12:00');
  const last = end ? new Date(end + 'T12:00') : first;
  const sameMonth = end && end !== start && start.slice(0, 7) === end.slice(0, 7);
  let heading = sameMonth ? first.getDate() : russianDate.format(first);
  if (end && end !== start) heading += ' — ' + russianDate.format(last);
  if (end && first.getFullYear() !== last.getFullYear()) {
    return russianDate.format(first) + ' ' + first.getFullYear() + ' — ' + russianDate.format(last) + ' ' + last.getFullYear();
  }
  if (withYear) heading += ' ' + last.getFullYear();
  return heading;
}
function timeHeading(date) {
  if (date.time === 4) return date.exact;
  if (timePresets[date.time]) return date.from + ' — ' + date.to;
  return times[0];
}

function isWaitlistPage() {
  return screen.startsWith('wait-') || screen === 'review' || screen === 'success';
}

function slideWaitlist(closing, finish = () => {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
    return;
  }
  const panel = widget.querySelector('.widget-page');
  if (bookingLayer) {
    widget.prepend(bookingLayer);
    bookingLayer.querySelector('main').scrollTop = Number(bookingLayer.dataset.scroll);
  }
  panel.inert = true;
  const positions = ['translateX(100%)', 'translateX(0)'];
  slide = panel.animate((closing ? positions.reverse() : positions).map(transform => ({ transform })),
    { duration: 300, easing: closing ? 'cubic-bezier(.4, 0, 1, 1)' : 'cubic-bezier(0, 0, .2, 1)', fill: 'both' });
  slide.finished.then(() => {
    slide.cancel();
    slide = null;
    panel.inert = false;
    bookingLayer?.remove();
    finish();
  });
}

function captureBookingPage() {
  bookingLayer?.remove();
  bookingLayer = widget.querySelector('.widget-page').cloneNode(true);
  bookingLayer.dataset.scroll = widget.querySelector('main').scrollTop;
  bookingLayer.classList.add('booking-underlay');
  bookingLayer.inert = true;
}

function leaveWaitlist() {
  const target = bookingLayer ? waitBack : 'home';
  if (target === 'booking-schedule') loadDate({ ...blankDate(), start: preferredDay });
  editing = null;
  rescheduling = false;
  const scroll = Number(bookingLayer?.dataset.scroll || 0);
  openScreen(target);
  widget.querySelector('main').scrollTop = scroll;
  bookingLayer = null;
}
function openScreen(next) {
  screen = next;
  search = '';
  render(false);
  widget.querySelector('h1, .success-intro h2')?.focus({ preventScroll: true });
}

function nextDate(value, offset = 1) {
  const date = new Date(value + 'T12:00');
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

function header() {
  return '<header class="nav">' + (screen === 'success' ? '' : iconButton('back', 'back', 'Назад')) + image('logo', 'avatar logo') + salon + (isWaitlistPage() ? iconButton('close', 'close', 'Закрыть') : '') + '</header>';
}

function title(label, instruction = '') {
  const count = editing ? '' : '<div class="step" aria-label="Шаг ' + (step + 1) + ' из ' + (queue.length + 1) + '"><b>' + (step + 1) + '</b><span>/</span><span>' + (queue.length + 1) + '</span></div>';
  return '<div class="screen-head"><h1 tabindex="-1">' + label + '</h1>' + (instruction ? count + '<p>' + instruction + '</p>' : '') + '</div>';
}

function footer(label, action, disabled = false, summary = '') {
  return '<footer class="footer compact">' + summary + button(action, label, 'primary', disabled ? 'disabled' : '') + '</footer>';
}

function menuRow(action, name, symbol) {
  return button(action, '<span class="round">' + icon(symbol) + '</span><span class="grow">' + name + '</span>' + icon('next'), 'menu-item row');
}

function home() {
  return '<main><div class="home-top">' + image('hero', 'hero') + image('logo', 'home-logo') +
    button('profile', icon('user'), 'round outline', 'aria-label="Мои заявки" style="position:absolute;right:24px;top:16px"') +
    '</div><div class="home-title compact"><h1 tabindex="-1">Beauty Nails Bar Pro</h1><small>Москва, пр-т Мира дом 211</small></div>' +
    '<div class="home-menu stack">' + button('promotion', icon('bell') + '<span class="grow">Скидка на окрашивание волос<br>−15% до конца мая</span>' + icon('next'), 'promo row') +
    '<section class="repeat compact"><div class="row">' + image('mikhail') + '<div class="grow"><div class="ellipsis">Укладка волос с окрашиванием</div><small>4 авг, 10:00 · Антон Подделкин</small></div></div>' +
    button('start-services', 'Записаться снова', 'secondary fill') + '</section>' +
    '<div>' + menuRow('start-staff', 'Выбрать специалиста', 'people') + menuRow('start-services', 'Выбрать услуги', 'list') +
    menuRow('start-date', 'Выбрать дату и время', 'calendar') + '</div>' +
    '<h2>Купить</h2>' + menuRow('purchase', 'Сертификат или абонемент', 'card') + '<div class="brand">Работает на ꓦ yclients</div></div></main>';
}

function personDetails(person) {
  return '<div class="compact"><span>' + person.name + '</span><small>' + person.role + '</small><small><span class="stars">★★★★★</span> ' + person.reviews + ' отзывов</small></div>';
}

function bookingStaff() {
  const date = booking.dates[0];
  const selectedTime = entry === 'date' && !showOtherTimes;
  const unavailable = person => !person.available;
  const availableList = staff.map((person, index) => ({ person, index }))
    .filter(({ person, index }) => !unavailable(person) && (index !== 3 || entry === 'services'));
  const busyList = staff.map((person, index) => ({ person, index })).filter(({ person }) => unavailable(person));
  function card({ person, index }, busy) {
    const firstSlot = index === 3 ? '12:30' : '08:50';
    const actionRow = busy ? button('wait-' + index, 'Записаться в лист ожидания', 'secondary') : selectedTime ? '' :
      '<small>Ближайшее время на ' + dateHeading(date?.start ? date : { start: todayKey }) + '</small><div class="chips">' +
      button('book-at-' + index, firstSlot, 'chip') + (index === 1 ? button('open-slot-08:55-' + index, '08:55', 'chip') + button('open-slot-09:00-' + index, '09:00', 'chip') : '') +
      (index === 3 ? button('open-slot-12:35-' + index, '12:35', 'chip') : '') + button('other-' + index, 'Другое время', 'chip') + '</div>';
    return '<article class="row person">' + image(person.photo) + '<div class="grow compact">' + personDetails(person) +
      (booking.services.length ? '<div class="price">' + money(booking.services.reduce((sum, id) => sum + services[id].price, 0)) + '</div>' : '') +
      actionRow + '</div>' + iconButton('info-' + index, 'info', 'О специалисте ' + person.name) +
      (selectedTime && !busy ? '<label class="staff-radio"><input type="radio" name="booking-staff" value="' + index +
        '" aria-label="' + person.name + '"' + (activeSpecialist === index ? ' checked' : '') + '></label>' : '') + '</article>';
  }
  const tabs = entry === 'date' ? tabBar(
    ['staff-at', dateHeading(date) + ', ' + timeHeading(date), selectedTime],
    ['staff-other', 'На другое время', !selectedTime]) : '';
  return '<main>' + title('Выберите специалиста') + tabs + '<div class="staff">' +
    (entry !== 'date' && availableList.length ? menuRow('any-staff', 'Любой специалист', 'people') : '') +
    availableList.map(item => card(item, false)).join('') + '<h3>Недоступные специалисты</h3>' +
    busyList.map(item => card(item, true)).join('') + '</div></main>';
}

function serviceResults() {
  const items = services.map((item, index) => ({ item, index })).filter(({ item }) =>
    (item.name + ' ' + item.note).toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')));
  if (!items.length) return '<p class="empty">Услуги не найдены</p>';
  return items.map(({ item, index }) => {
    const selected = choosing.includes(index);
    return '<h2>' + (index === 0 ? 'Маникюр' : 'Укладка') + '</h2>' + button('pick-' + index, image(item.photo, '') + '<span class="row"><span class="grow compact"><span>' + item.name +
      ' <span class="muted">' + duration(item.minutes) + '</span></span><small>' + item.note + '</small><span class="price">' + money(item.price) +
      (item.prepaid ? ' <span class="badge">100% предоплата</span>' : '') + '</span></span><span class="check ' + (selected ? 'checked' : '') +
      '">' + (selected ? icon('check') : '') + '</span></span>', 'service', 'aria-pressed="' + selected + '"');
  }).join('');
}

function serviceScreen() {
  const bookingMode = screen === 'booking-services';
  const heading = bookingMode ? title('Выберите услуги') : title(editing ? 'Услуги' : 'Заявка в лист ожидания', editing ? '' : 'Выберите одну или несколько услуг');
  const next = bookingMode ? 'Выбрать специалиста' : editing ? 'Сохранить' : queue[step + 1] === 'wait-date' ? 'Выбрать дату и время' : 'Дальше';
  return '<main>' + heading + '<div class="search"><input id="search" type="search" placeholder="Найти услугу" aria-label="Найти услугу" value="' +
    safe(search) + '"></div><div class="results" id="results">' + serviceResults() + '</div></main>' +
    (bookingMode && !choosing.length ? '' : footer(next, 'continue', !choosing.length, bookingMode ? selectionSummary(choosing) : ''));
}

function selectionSummary(selection) {
  const items = selection.map(index => services[index]);
  return '<div class="row"><span class="grow">' + pluralServices(items.length) +
    ' <span class="muted">' + duration(items.reduce((sum, item) => sum + item.minutes, 0)) +
    '</span></span><span>' + money(items.reduce((sum, item) => sum + item.price, 0)) + '</span></div>';
}

function tabBar(...tabs) {
  return '<div class="booking-tabs">' + tabs.map(([action, label, active]) =>
    button(action, safe(label), 'booking-tab', 'aria-pressed="' + active + '"')).join('') + '</div>';
}

function scheduleScreen() {
  const firstStep = screen === 'booking-date';
  const unavailable = !firstStep && !scheduleAll && new Date(dateDraft.start + 'T12:00').getDay() % 2 !== today.getDay() % 2;
  let nearest = nextDate(dateDraft.start);
  if (new Date(nearest + 'T12:00').getDay() % 2 !== today.getDay() % 2) nearest = nextDate(nearest);
  const personName = firstStep ? 'Людмила Шишкина' : schedulePerson === null ? 'Выбранный специалист' : staff[schedulePerson].name;
  const visibleSlots = firstStep || scheduleAll ? bookingSlots :
    [['День', ['12:30', '12:35', '12:40']], bookingSlots[2]];
  const slots = visibleSlots.map(([label, values]) => '<details open class="slot-group"><summary>' + label + '</summary><div class="slot-grid">' +
    values.map(value => button('choose-slot-' + value, value, 'chip', 'aria-pressed="' + (dateDraft.exact === value) + '"')).join('') + '</div></details>').join('');
  const waitButton = button('schedule-wait', 'Записаться в лист ожидания', 'secondary fill');
  const availability = unavailable ?
    '<section class="schedule-empty stack"><h2>В этот день нет свободного времени</h2><p class="muted">Ближайшая доступная дата:<br>' +
    dateHeading({ start: nearest }) + '</p>' + button('nearest-' + nearest, 'Перейти к ближайшей дате') + waitButton + '</section>' :
    '<section class="schedule-slots">' + slots + (firstStep ? '' :
      '<div class="schedule-prompt compact"><p>Нет подходящего времени? Запишитесь в лист ожидания — сообщим, когда появится окно</p>' + waitButton + '</div>') + '</section>';
  return '<main class="schedule"><section class="schedule-calendar">' + tabBar(
    ['schedule-person', personName, !scheduleAll], ['schedule-all', 'Все специалисты', scheduleAll]) +
    '<div class="schedule-days">' + (calendarOpen ? calendar() : '<p>' + dateHeading(dateDraft, true) + '</p>') +
    button('toggle-calendar', icon(calendarOpen ? 'back' : 'next'), 'icon calendar-toggle',
      'aria-label="' + (calendarOpen ? 'Свернуть календарь' : 'Развернуть календарь') + '" aria-expanded="' + calendarOpen + '"') +
    '</div></section>' + availability + '</main>' + (dateDraft.exact && !unavailable ?
      footer(firstStep ? 'Выбрать услугу' : 'Выбрать время', firstStep ? 'date-to-services' : 'confirm-slot') : '');
}

function calendar() {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const dates = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, 1 - offset + index);
    const value = dateKey(date);
    const selected = value === dateDraft.start || value === dateDraft.end;
    const inRange = value > dateDraft.start && value < dateDraft.end;
    const cls = ['day', value === todayKey && 'today', date.getMonth() !== month && 'muted', selected && 'selected', inRange && 'in-range'].filter(Boolean).join(' ');
    return button('day-' + value, date.getDate(), cls, 'aria-label="' + russianDate.format(date) + '" aria-pressed="' + selected + '"' + (value < todayKey ? ' disabled' : ''));
  }).join('');
  const monthOptions = months.map((name, index) => '<option value="' + index + '"' + (index === month ? ' selected' : '') + '>' +
    name[0].toUpperCase() + name.slice(1) + '</option>').join('');
  const yearOptions = Array.from({ length: 6 }, (_, index) => today.getFullYear() + index).map(value =>
    '<option' + (value === year ? ' selected' : '') + '>' + value + '</option>').join('');
  const minMonth = year === today.getFullYear() && month === today.getMonth();
  return '<div class="calendar"><div class="row"><select id="month" aria-label="Месяц">' + monthOptions + '</select>' +
    '<select id="year" aria-label="Год">' + yearOptions + '</select><span class="grow"></span>' +
    '<button type="button" class="icon" data-action="prev-month" aria-label="Предыдущий месяц"' + (minMonth ? ' disabled' : '') + '>' + icon('back') +
    '</button>' + iconButton('next-month', 'next', 'Следующий месяц') + '</div><div class="days">' +
    ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(day => '<span class="muted">' + day + '</span>').join('') + dates + '</div></div>';
}

function dateReady() {
  return Boolean(dateDraft.start && (dateDraft.mode === 'single' || dateDraft.end) && (dateDraft.time !== 4 || dateDraft.exact) && (!timePresets[dateDraft.time] || (dateDraft.from && dateDraft.to && dateDraft.from <= dateDraft.to)));
}

function dateScreen() {
  const bookingMode = screen === 'booking-date';
  const heading = bookingMode ? title('Выберите дату и время') :
    title(editing ? 'Дата и время' : 'Заявка в лист ожидания', editing ? '' : 'Удобные день и время для записи');
  return '<main>' + heading + '<div class="date-block stack"><h3>' + (bookingMode ? 'День' : 'День или период') + '</h3>' +
    (bookingMode ? '' : '<div class="chips">' + button('mode-single', 'Один день', 'chip', 'aria-pressed="' + (dateDraft.mode === 'single') + '"') +
    button('mode-range', 'Период', 'chip', 'aria-pressed="' + (dateDraft.mode === 'range') + '"') + '</div>') +
    calendar() + (dateDraft.mode === 'range' ? '<small>' + (dateDraft.start && !dateDraft.end ? 'Выберите последний день периода' : dateDraft.end ? dateHeading(dateDraft) : 'Выберите первый день периода') + '</small>' : '') +
    '<h3>Время начала записи</h3><div class="chips time-options" role="group" aria-label="Время начала записи">' + times.map((label, index) =>
      button('time-' + index, label, 'chip', 'aria-pressed="' + (dateDraft.time === index) + '"')).join('') + '</div>' +
    (dateDraft.time === 4 ? '<label class="field">Точное время<input id="exact" type="time" value="' + safe(dateDraft.exact) + '" required></label>' : '') +
    (timePresets[dateDraft.time] ? '<div class="time-range"><label class="field">С<input id="from" type="time" value="' + dateDraft.from +
      '" required></label><span aria-hidden="true">–</span><label class="field">До<input id="to" type="time" value="' + dateDraft.to +
      '" required></label><small class="time-error" id="time-error"' + (dateDraft.from <= dateDraft.to ? ' hidden' : '') +
      '>Время «До» должно быть не раньше времени «С»</small></div>' : '') +
    '</div></main>' + footer(bookingMode ? 'Выбрать специалиста' : editing ? 'Сохранить' : 'Дальше', 'continue', !dateReady());
}

function staffPicker() {
  return '<main>' + title(editing ? 'Специалисты' : 'Заявка в лист ожидания', editing ? '' : 'Выберите специалиста') +
    '<div class="staff">' + staff.map((person, index) => button('pick-' + index,
      image(person.photo) + '<span class="grow">' + person.name + '<br><small>' + person.role + '</small></span><span class="radio ' +
      (choosing.includes(index) ? 'checked' : '') + '"></span>', 'plain person-pick', 'aria-pressed="' + choosing.includes(index) + '"')).join('') +
    '</div></main>' + footer(editing ? 'Сохранить' : 'Дальше', 'continue', !choosing.length);
}

const add = (action, label) => button(action, icon('plus') + label, 'plain row add');
function serviceSummary() {
  return request.services.map(index => {
    const service = services[index];
    return '<div class="row"><div class="grow">' + service.name + '<br><small>' + duration(service.minutes) + '</small></div><div class="service-price"><span>' +
      money(service.price) + '</span>' + (service.prepaid ? '<span class="badge">100% предоплата</span>' : '') + '</div></div>';
  }).join('');
}

function review() {
  const fields = [
    ['name', 'Имя *', 'Введите имя', 'text', 'name', 'required'],
    ['phone', 'Телефон *', 'Номер с кодом страны', 'tel', 'tel', 'required'],
    ['email', 'Электронная почта', 'Введите e-mail', 'email', 'email', ''],
  ].map(([key, label, placeholder, type, autocomplete, required]) =>
    '<label class="field">' + label + '<input id="' + key + '" name="' + key + '" type="' + type + '" autocomplete="' +
    autocomplete + '" placeholder="' + placeholder + '" value="' + safe(request[key]) + '" ' + required + '></label>').join('');
  return '<main class="review">' + title('Заявка в лист ожидания', entry === 'date' ? '' : 'Подтвердите заявку') +
    '<section class="card compact">' + request.staff.map(index => {
      const person = staff[index];
      return '<div class="row">' + image(person.photo) + '<div class="grow">' + person.name + '<br><small>' + person.role + '</small></div>' +
        iconButton('edit-staff', 'edit', 'Изменить специалистов') + '</div>';
    }).join('') + add('edit-staff', 'Добавить сотрудника') + '</section>' +
    '<section class="card compact">' + request.dates.map((date, index) =>
      '<div class="row"><span class="round">' + icon('calendar') + '</span><div class="grow">' + dateHeading(date) + '<br><small>' +
      safe(timeHeading(date)) + '</small></div>' + iconButton('edit-date-' + index, 'edit', 'Изменить дату и время') + '</div>').join('') +
    add('add-date', 'Добавить дату и время') + '</section><section class="card compact">' + serviceSummary() + add('edit-services', 'Добавить услугу') +
    '</section><form id="details" class="card stack"><h2>Ваши данные</h2>' + fields +
    '<label class="field">Комментарий к заявке<textarea id="comment" name="comment" placeholder="Введите комментарий">' + safe(request.comment) +
    '</textarea></label><label class="consent"><input type="checkbox" required id="consent"' + (request.consent ? ' checked' : '') +
    '>Я даю согласие на обработку персональных данных *</label><label class="consent"><input type="checkbox" id="updates"' +
    (request.updates ? ' checked' : '') + '>Я согласен получать информационные сообщения</label></form></main>' +
    footer('Отправить заявку в лист ожидания', 'submit', false, entry === 'date' ? '' : selectionSummary(request.services));
}

function success() {
  const actions = [['restart', 'plus', 'Создать ещё заявку'], ['reschedule', 'move', 'Перенести заявку'], ['cancel-request', 'close', 'Отменить заявку']];
  return '<main class="pad stack wait-success"><div class="success-intro compact" role="status"><span class="round">' + icon('check') +
    '</span><h2 tabindex="-1">Вы записаны в лист ожидания</h2><p>Администратор свяжется с вами сразу, когда появится подходящее место</p></div>' +
    '<section class="success-card"><div class="success-dates compact">' + request.dates.map(date =>
      '<div><h3>' + dateHeading(date, true) + '</h3><p>' + safe(timeHeading(date)) + '</p></div>').join('') + '</div>' +
    '<div class="success-staff compact">' + request.staff.map(index => '<div class="row">' + image(staff[index].photo) +
      '<div>' + staff[index].name + '<br><small>' + staff[index].role + '</small></div></div>').join('') + '</div>' +
    '<div class="success-services compact">' + serviceSummary() + '</div></section>' +
    '<div class="row actions">' + actions.map(([action, symbol, label], index) =>
      button(action, '<span class="round ' + (index === 0 ? 'dark' : 'outline') + '">' + icon(symbol) + '</span>' + label, 'plain')).join('') +
    '</div>' +
    '<section class="gift compact"><h2>Подарок за запись</h2>' +
    image('gift', '') + button('gift', 'Забрать', 'chip', 'aria-pressed="true"') +
    '</section><section class="stack"><h2>Контакты</h2><div class="row">' + image('logo') + salon + '</div></section></main>';
}

function render(keepScroll = true) {
  const oldMain = widget.querySelector('main');
  const scroll = keepScroll ? oldMain?.scrollTop : 0;
  const timeScroll = keepScroll ? oldMain?.querySelector('.time-options')?.scrollLeft : 0;
  const pages = {
    home, 'booking-staff': bookingStaff, 'booking-services': serviceScreen, 'wait-services': serviceScreen,
    'booking-date': scheduleScreen, 'booking-schedule': scheduleScreen, 'wait-date': dateScreen, 'wait-staff': staffPicker, review, success,
  };
  widget.innerHTML = '<div class="widget-page">' + (screen === 'home' ? '' : header()) + pages[screen]() + '</div>';
  if (scroll) widget.querySelector('main').scrollTop = scroll;
  const options = widget.querySelector('.time-options');
  if (options && timeScroll) options.scrollLeft = timeScroll;
}

function loadDate(date = blankDate()) {
  dateDraft = { ...date };
  const current = date.start ? new Date(date.start + 'T12:00') : today;
  month = current.getMonth();
  year = current.getFullYear();
}

function openStep() {
  const next = queue[step] || 'review';
  if (next === 'wait-services') choosing = [...request.services];
  if (next === 'wait-date') {
    loadDate(request.dates[0] || (preferredDay ? { ...blankDate(), start: preferredDay } : undefined));
  }
  openScreen(next);
}

function start(origin) {
  entry = origin;
  booking = blankRequest();
  request = blankRequest();
  editing = null;
  rescheduling = false;
  slotsPerson = null;
  choosing = [];
  scheduleAll = false;
  showOtherTimes = false;
  calendarOpen = true;
  waitBack = 'booking-staff';
  preferredDay = '';
  activeSpecialist = 0;
  bookingLayer = null;
  loadDate(origin === 'date' ? { ...blankDate(), start: todayKey } : undefined);
  openScreen('booking-' + origin);
}

function join(index) {
  captureBookingPage();
  request = { ...blankRequest(), ...structuredClone(booking), staff: [index] };
  waitBack = screen;
  queue = [];
  if (!request.services.length) queue.push('wait-services');
  if (!request.dates.length) queue.push('wait-date');
  step = 0;
  openStep();
  slideWaitlist(false, () => widget.querySelector('h1')?.focus({ preventScroll: true }));
}

function edit(type, index = null) {
  editing = { type, index };
  if (type === 'date') loadDate(request.dates[index]);
  else choosing = [...request[type]];
  openScreen('wait-' + type);
}

function continueFlow() {
  if (screen.endsWith('date') && !dateReady()) return;
  if (screen.endsWith('services') && !choosing.length) return;
  if (editing) {
    if (editing.type === 'date') {
      const index = editing.index ?? request.dates.length;
      const normalized = { ...dateDraft, end: dateDraft.end === dateDraft.start ? '' : dateDraft.end };
      const duplicate = request.dates.some((date, position) => position !== index &&
        date.start === normalized.start && date.end === normalized.end && timeHeading(date) === timeHeading(normalized));
      if (duplicate) {
        showDialog('Дата и время уже добавлены', 'Выберите другой день, период или время.');
        return;
      }
      request.dates[index] = normalized;
    } else request[editing.type] = [...choosing];
    editing = null;
    openScreen('review');
    return;
  }
  if (screen === 'booking-services') {
    booking.services = [...choosing];
    openScreen('booking-staff');
  } else {
    if (screen === 'wait-services') request.services = [...choosing];
    if (screen === 'wait-date') request.dates = [{ ...dateDraft }];
    step += 1;
    openStep();
  }
}

function back() {
  if (editing) {
    editing = null;
    openScreen('review');
  } else if (rescheduling && screen === 'review') {
    request = rescheduling;
    rescheduling = false;
    openScreen('success');
  } else if (screen.startsWith('wait-') || screen === 'review') {
    if (step > 0) {
      step -= 1;
      openStep();
    } else slideWaitlist(true, leaveWaitlist);
  } else if (screen === 'booking-staff' && entry !== 'staff') {
    choosing = [...booking.services];
    openScreen('booking-services');
  } else if (screen === 'booking-services' && entry === 'date') {
    loadDate(booking.dates[0]);
    openScreen('booking-date');
  } else if (screen === 'booking-schedule') openScreen('booking-staff');
  else openScreen('home');
}

function showDialog(heading, body, confirmAction = '', confirmLabel = '') {
  dialog.innerHTML = '<div class="stack"><h2>' + heading + '</h2><p>' + body + '</p><div class="row">' +
    button('dismiss', confirmAction ? 'Назад' : 'Понятно', 'secondary') + (confirmAction ? button(confirmAction, confirmLabel) : '') + '</div></div>';
  dialog.showModal();
}

function submit() {
  const details = widget.querySelector('#details');
  const phone = details.elements.phone;
  phone.setCustomValidity(request.phone.replace(/\D/g, '').length >= 10 || !request.phone ? '' : 'Введите номер телефона с кодом страны');
  details.elements.name.setCustomValidity(request.name.trim() || !request.name ? '' : 'Введите имя');
  if (!details.reportValidity()) return;
  submitted = { request: structuredClone(request), entry };
  rescheduling = false;
  openScreen('success');
}

function chooseDate(value) {
  if (dateDraft.mode === 'single' || !dateDraft.start || dateDraft.end) {
    dateDraft.start = value;
    dateDraft.end = '';
  } else {
    [dateDraft.start, dateDraft.end] = [dateDraft.start, value].sort();
  }
}

function chooseTime(index) {
  if (dateDraft.time === index) return;
  dateDraft.time = index;
  [dateDraft.from, dateDraft.to] = timePresets[index] || ['', ''];
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger || trigger.disabled || slide) return;
  const action = trigger.dataset.action;
  const separator = action.indexOf('-');
  const arg = action.slice(separator + 1);
  const numeric = Number(arg);
  if (action.startsWith('start-')) return start(arg);
  if (action.startsWith('wait-')) {
    preferredDay = '';
    return join(numeric);
  }
  if (action.startsWith('choose-slot-')) {
    dateDraft.time = 4;
    dateDraft.exact = action.slice('choose-slot-'.length);
    render();
    return;
  }
  if (action.startsWith('nearest-')) {
    loadDate({ ...blankDate(), start: arg });
    render();
    return;
  }
  if (action.startsWith('book-at-') || action.startsWith('open-slot-')) {
    const index = action.startsWith('book-at-') ? Number(action.slice('book-at-'.length)) : Number(action.at(-1));
    const time = action.startsWith('open-slot-') ? action.slice('open-slot-'.length, -2) :
      entry === 'date' && !showOtherTimes ? booking.dates[0].exact : index === 3 ? '12:30' : '08:50';
    const day = entry === 'date' && !showOtherTimes ? booking.dates[0] : { start: todayKey };
    return showDialog('Доступное время', staff[index].name + ' · ' + dateHeading(day) + ', ' + time);
  }
  if (action.startsWith('info-')) return showDialog(staff[numeric].name, staff[numeric].role + ' · ' + staff[numeric].reviews + ' отзывов');
  if (action.startsWith('pick-')) {
    choosing = choosing.includes(numeric) ? choosing.filter(value => value !== numeric) : [...choosing, numeric];
  } else if (action.startsWith('day-')) {
    chooseDate(arg);
    if (screen === 'booking-date' || screen === 'booking-schedule') dateDraft.exact = '';
  }
  else if (action.startsWith('time-')) chooseTime(numeric);
  else if (action.startsWith('mode-')) {
    dateDraft.mode = arg;
    if (arg === 'single') dateDraft.end = '';
  } else if (action === 'prev-month' || action === 'next-month') {
    const next = new Date(year, month + (action === 'next-month' ? 1 : -1), 1);
    if (next.getFullYear() > today.getFullYear() + 5) return;
    year = next.getFullYear();
    month = next.getMonth();
  } else {
    switch (action) {
      case 'continue': return continueFlow();
      case 'date-to-services':
        booking.dates = [{ ...dateDraft }];
        choosing = [...booking.services];
        return openScreen('booking-services');
      case 'schedule-wait':
        preferredDay = dateDraft.start;
        return join(schedulePerson ?? 2);
      case 'confirm-slot':
        return showDialog('Доступное время', dateHeading(dateDraft) + ', ' + dateDraft.exact);
      case 'toggle-calendar': calendarOpen = !calendarOpen; break;
      case 'schedule-person':
      case 'schedule-all':
        scheduleAll = action === 'schedule-all';
        dateDraft.exact = '';
        break;
      case 'staff-at':
      case 'staff-other':
        showOtherTimes = action === 'staff-other';
        break;
      case 'back': return back();
      case 'close': return slideWaitlist(true, leaveWaitlist);
      case 'restart': return openScreen('home');
      case 'edit-staff': return edit('staff');
      case 'edit-services': return edit('services');
      case 'add-date': return edit('date');
      case 'submit': return submit();
      case 'dismiss': return dialog.close();
      case 'profile':
        if (submitted) {
          captureBookingPage();
          waitBack = 'home';
          request = structuredClone(submitted.request);
          entry = submitted.entry;
          return openScreen('success');
        }
        return showDialog('Мои заявки', 'У вас пока нет заявок в листе ожидания.');
      case 'promotion': return showDialog('Скидка на окрашивание волос', 'Скидка 15% до конца мая.');
      case 'purchase': return showDialog('Сертификат или абонемент', 'Уточните условия покупки у администратора Beauty Nails Bar Pro.');
      case 'gift': return showDialog('Подарок за запись', 'Уточните условия акции у администратора Beauty Nails Bar Pro.');
      case 'reschedule':
        rescheduling = structuredClone(request);
        queue = [];
        step = 0;
        return edit('date', 0);
      case 'cancel-request': return showDialog('Отменить заявку?', 'Заявка будет удалена из листа ожидания.', 'cancel-confirmed', 'Отменить заявку');
      case 'cancel-confirmed':
        submitted = false;
        dialog.close();
        return openScreen('home');
      case 'any-staff':
        slotsPerson = null;
        return showDialog('Любой специалист', 'Доступное время для записи сегодня — 08:50.', 'book-slot', 'Выбрать 08:50');
      case 'book-slot':
        dialog.close();
        return showDialog('Время выбрано', '08:50 · ' + (slotsPerson === null ? 'Любой специалист' : staff[slotsPerson].name));
      default:
        if (action.startsWith('edit-date-')) return edit('date', Number(action.slice(10)));
        if (action.startsWith('other-')) {
          schedulePerson = numeric;
          scheduleAll = false;
          calendarOpen = true;
          loadDate({ ...blankDate(), start: booking.dates[0]?.start || todayKey });
          return openScreen('booking-schedule');
        }
        return;
    }
  }
  render();
  widget.querySelector('[data-action="' + action + '"]')?.focus({ preventScroll: true });
});

widget.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'search') {
    search = input.value;
    widget.querySelector('#results').innerHTML = serviceResults();
  } else if (['exact', 'from', 'to'].includes(input.id)) {
    dateDraft[input.id] = input.value;
    const error = widget.querySelector('#time-error');
    if (error) error.hidden = !dateDraft.from || !dateDraft.to || dateDraft.from <= dateDraft.to;
    widget.querySelector('[data-action="continue"]').disabled = !dateReady();
  } else if (input.closest('#details') && Object.hasOwn(request, input.id)) {
    request[input.id] = input.type === 'checkbox' ? input.checked : input.value;
    input.setCustomValidity('');
  }
});

widget.addEventListener('change', event => {
  if (event.target.name === 'booking-staff') {
    activeSpecialist = Number(event.target.value);
  } else if (event.target.id === 'month') {
    month = Number(event.target.value);
    if (year === today.getFullYear()) month = Math.max(month, today.getMonth());
    render();
  } else if (event.target.id === 'year') {
    year = Number(event.target.value);
    if (year === today.getFullYear()) month = Math.max(month, today.getMonth());
    render();
  }
});

widget.addEventListener('submit', event => {
  event.preventDefault();
  if (screen === 'review') submit();
});

render();
