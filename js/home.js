const industriesData = {
  complex: {
    title: "Объекты повышенной сложности",
    image: "images/reference-complex.webp",
    projects: [
      "Атомфлот",
      "Рязанский НПЗ",
      "ПНТЗ",
      "МКБ «Факел»",
      "Станция радиоконтроля «Крым»",
    ],
  },
  industrial: {
    title: "Промышленные предприятия",
    image: "images/reference-industrial.webp",
    projects: [
      "ПАО «ГАЗ»",
      "ООО «Пластимат»",
      "Винно-коньячный завод «Альянс-1892»",
      "ООО «ТФЗ»",
      "ОЭЗ «Алабуга»",
      "ООО «Нефтетранссервис»",
      "АО «Элас ПАК»",
      "ООО «ПКЗ»",
      "Мулинское рыбоводное хозяйство",
    ],
  },
  logistics: {
    title: "Логистика и склады",
    image: "images/reference-logistics.webp",
    projects: [
      "Логистический центр «Летуаль»",
      "Складской комплекс «Лохино»",
      "Агропромышленный парк с оптово-распределительным центром в Южно-Сахалинске",
    ],
  },
  metro: {
    title: "Метрополитен и железнодорожная инфраструктура",
    image: "images/reference-metro.webp",
    projects: [
      "Станция «Стромынка»",
      "Станция «Нижняя Масловка»",
      "Станция «Рижская»",
      "Платформа «Кокошкино»",
    ],
  },
  roads: {
    title: "Дороги и автомагистрали",
    image: "images/reference-roads.webp",
    projects: [
      "Автомобильная дорога А-108",
      "ЦКАД-1",
      "ЦКАД-3",
      "Автомобильная дорога М-5 «Урал»",
      "Реконструкция автомобильной дороги — Внуковское шоссе",
      "Улично-дорожная сеть к медсанчасти №47 в Раменках",
    ],
  },
  commercial: {
    title: "Коммерческие и жилые объекты",
    image: "images/reference-commercial.webp",
    projects: [
      "Жилой комплекс «Крылья»",
      "Жилой комплекс «Героев»",
      "Бизнес-центр «Сильвер Стоун»",
      "Ресторан «Кофемания»",
      "Торговый комплекс «Нагорный»",
      "Коттеджный посёлок «Бариново-парк»",
      "Офисные кабинеты АО «Завод Искож»",
    ],
  },
  government: {
    title: "Государственные и муниципальные объекты",
    image: "images/reference-government.webp",
    projects: [
      "Префектура ТиНАО, Москва",
      "Кафедральный собор Христа Спасителя, Калининград",
      "Москвариум, Москва",
      "Благоустройство дворовых территорий, Саки",
      "Центральный парк имени И. А. Бунина, Тверь",
      "Демонстрационные залы МГТУ им. Н. Э. Баумана",
    ],
  },
  it: {
    title: "IT и инженерная инфраструктура",
    image: "images/reference-it.webp",
    projects: ["МЦОД «ТМХ»", "МЦОД МАИ", "Сервисный центр в НИИ «Прогресс»"],
  },
  sports: {
    title: "Спортивные объекты",
    image: "images/reference-sports.webp",
    projects: [
      "СДЮСШОР по волейболу им. Савина",
      "Стадион МБОУ Полянская СОШ",
      "Крытый каток с искусственным льдом, Омск",
      "Спортивная площадка «Декатлон»",
    ],
  },
};

(() => {
  const panel = document.getElementById("industry-panel");
  const tabs = [...document.querySelectorAll(".industry-tab")];
  let changeTimer;
  function renderIndustry(key, animate = false) {
    const item = industriesData[key];
    if (!item || !panel) return;
    clearTimeout(changeTimer);
    if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      panel.classList.add("is-changing");
    function update() {
      document.getElementById("industry-bg").style.backgroundImage =
        `url('${item.image}')`;
      document.getElementById("industry-title").textContent = item.title;
      document.getElementById("industry-count").textContent =
        `${item.projects.length} ${item.projects.length === 1 ? "объект" : item.projects.length < 5 ? "объекта" : "объектов"}`;
      document.getElementById("industry-projects").replaceChildren(
        ...item.projects.map((name) => {
          const li = document.createElement("li");
          li.textContent = name;
          return li;
        }),
      );
      tabs.forEach((tab) => {
        const selected = tab.dataset.industry === key;
        tab.classList.toggle("active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", "industry-" + key);
      panel.classList.remove("is-changing");
    }
    animate ? (changeTimer = setTimeout(update, 120)) : update();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () =>
      renderIndustry(tab.dataset.industry, true),
    );
    tab.addEventListener("keydown", (e) => {
      const direction = ["ArrowRight", "ArrowDown"].includes(e.key)
        ? 1
        : ["ArrowLeft", "ArrowUp"].includes(e.key)
          ? -1
          : 0;
      if (!direction && !["Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? tabs.length - 1
            : (i + direction + tabs.length) % tabs.length;
      tabs[next].focus();
      renderIndustry(tabs[next].dataset.industry);
    });
  });
  renderIndustry("complex");
  const stage = document.querySelector(".light-stage");
  if (
    !stage ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData
  )
    return;
  const load = () =>
    import("./light-scene.js")
      .then((module) => module.startLightScene(stage))
      .catch(() => {});
  const observe = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observe.disconnect();
        if ("requestIdleCallback" in window)
          requestIdleCallback(load, { timeout: 1200 });
        else setTimeout(load, 150);
      }
    },
    { rootMargin: "160px" },
  );
  observe.observe(stage);
})();
