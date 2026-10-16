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

const industryScenes = {
  complex: {
    description:
      "Свет для сложной производственной среды. Подбор оборудования по условиям эксплуатации и требованиям проекта.",
    shift: "-8%",
    angle: "-5deg",
    position: "center 56%",
  },
  industrial: {
    description:
      "Рабочие зоны и производственные пространства. Освещение с учётом задач персонала, монтажа и условий эксплуатации.",
    shift: "7%",
    angle: "8deg",
    position: "center 55%",
  },
  logistics: {
    description:
      "Пространства хранения и движения. Подбор светораспределения под высоту, стеллажи и рабочие проходы.",
    shift: "-3%",
    angle: "-10deg",
    position: "center 55%",
  },
  metro: {
    description:
      "Станции, платформы и транспортные пространства. Свет как часть инфраструктуры ежедневного движения.",
    shift: "10%",
    angle: "3deg",
    position: "center 50%",
  },
  roads: {
    description:
      "Дороги и транспортные связи. Оборудование для наружных условий с подбором мощности, защиты и оптики.",
    shift: "-10%",
    angle: "12deg",
    position: "center 50%",
  },
  commercial: {
    description:
      "Общественные, рабочие и жилые пространства. Освещение для архитектуры, повседневных задач и комфортного восприятия.",
    shift: "3%",
    angle: "-7deg",
    position: "center 52%",
  },
  government: {
    description:
      "Городские и общественные объекты. Световые решения с учётом назначения пространства и требований проекта.",
    shift: "-4%",
    angle: "7deg",
    position: "center 50%",
  },
  it: {
    description:
      "Инженерная инфраструктура и технические помещения. Точный подбор оборудования по условиям объекта.",
    shift: "9%",
    angle: "-4deg",
    position: "center 56%",
  },
  sports: {
    description:
      "Спортивные пространства — от площадок до крытых арен. Подбор оборудования по задаче и условиям эксплуатации.",
    shift: "-6%",
    angle: "-9deg",
    position: "center 52%",
  },
};
(() => {
  const panel = document.getElementById("industry-panel");
  const tabs = [...document.querySelectorAll(".industry-tab")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let generation = 0,
    current = "complex",
    imageTimer;
  function renderIndustry(key, animate = false) {
    const item = industriesData[key],
      scene = industryScenes[key];
    if (!item || !panel) return;
    const same = key === current;
    current = key;
    const version = ++generation;
    document.getElementById("industry-title").textContent = item.title;
    document.getElementById("industry-description").textContent =
      scene.description;
    document.getElementById("industry-count").textContent =
      `${item.projects.length} ${item.projects.length === 1 ? "объект" : item.projects.length < 5 ? "объекта" : "объектов"}`;
    document.getElementById("industry-projects").replaceChildren(
      ...item.projects.map((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        return li;
      }),
    );
    const index = tabs.findIndex((tab) => tab.dataset.industry === key);
    document.getElementById("industry-folio").textContent =
      `${String(index + 1).padStart(2, "0")} / 09`;
    panel.style.setProperty("--scene-shift", scene.shift);
    panel.style.setProperty("--scene-angle", scene.angle);
    panel.dataset.industry = key;
    tabs.forEach((tab) => {
      const selected = tab.dataset.industry === key;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", "industry-" + key);
    if (same) return;
    const base = document.getElementById("industry-bg"),
      next = document.getElementById("industry-bg-next");
    const picture = new Image();
    picture.src = item.image;
    const ready = picture.decode
      ? picture.decode()
      : new Promise((resolve) => {
          picture.onload = resolve;
          picture.onerror = resolve;
        });
    ready
      .catch(() => {})
      .then(() => {
        if (version !== generation) return;
        clearTimeout(imageTimer);
        if (!animate || reduced.matches) {
          base.style.backgroundImage = `url('${item.image}')`;
          base.style.backgroundPosition = scene.position;
          next.classList.remove("is-visible");
          return;
        }
        if (next.classList.contains("is-visible")) {
          base.style.backgroundImage = next.style.backgroundImage;
          base.style.backgroundPosition = next.style.backgroundPosition;
        }
        next.style.transition = "none";
        next.classList.remove("is-visible");
        void next.offsetWidth;
        next.style.transition = "";
        next.style.backgroundImage = `url('${item.image}')`;
        next.style.backgroundPosition = scene.position;
        next.classList.add("is-visible");
        imageTimer = setTimeout(() => {
          if (version !== generation) return;
          base.style.backgroundImage = next.style.backgroundImage;
          base.style.backgroundPosition = next.style.backgroundPosition;
          next.style.transition = "none";
          next.classList.remove("is-visible");
          void next.offsetWidth;
          next.style.transition = "";
        }, 1150);
      });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () =>
      renderIndustry(tab.dataset.industry, true),
    );
    tab.addEventListener("keydown", (event) => {
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
        ? 1
        : ["ArrowLeft", "ArrowUp"].includes(event.key)
          ? -1
          : 0;
      if (!direction && !["Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (i + direction + tabs.length) % tabs.length;
      tabs[next].focus();
      renderIndustry(tabs[next].dataset.industry, true);
    });
  });
  document
    .querySelectorAll("[data-explore]")
    .forEach((link) =>
      link.addEventListener("click", () =>
        renderIndustry(link.dataset.explore, true),
      ),
    );
  renderIndustry("complex");
  const brandProducts = {
    FEREKS: { image: "images/fereks-dso.webp", name: "ДСО" },
    LEDEL: { image: "images/ledel-l-lego-ii.webp", name: "L-lego II" },
    ARUNA: { image: "images/aruna-arslim.webp", name: "ARSLIM" },
    LUXCORE: { image: "images/luxcore-primum-s.webp", name: "Primum-S" },
    PLG: { image: null, name: "Profi Lighting Group" },
  };
  let brandVersion = 0,
    activeBrand = "FEREKS";
  const brandLinks = [...document.querySelectorAll("[data-brand-preview]")];
  function previewBrand(brand) {
    if (brand === activeBrand) return;
    activeBrand = brand;
    const version = ++brandVersion,
      product = brandProducts[brand];
    const image = document.getElementById("brand-preview-image"),
      placeholder = document.getElementById("brand-preview-placeholder");
    brandLinks.forEach((link) =>
      link.classList.toggle("is-preview", link.dataset.brandPreview === brand),
    );
    document.getElementById("brand-preview-caption").textContent =
      brand + " / " + product.name;
    if (!product.image) {
      image.hidden = true;
      placeholder.hidden = false;
      return;
    }
    const preload = new Image();
    preload.src = product.image;
    (preload.decode ? preload.decode() : Promise.resolve())
      .catch(() => {})
      .then(() => {
        if (version !== brandVersion) return;
        image.src = product.image;
        image.hidden = false;
        placeholder.hidden = true;
      });
  }
  brandLinks.forEach((link) => {
    link.addEventListener("pointerenter", () =>
      previewBrand(link.dataset.brandPreview),
    );
    link.addEventListener("focus", () =>
      previewBrand(link.dataset.brandPreview),
    );
  });
  brandLinks[0]?.classList.add("is-preview");
  const stage = document.querySelector(".light-stage");
  if (!stage || reduced.matches || navigator.connection?.saveData) return;
  const load = () =>
    import("./light-scene.js")
      .then((module) => module.startLightScene(stage))
      .catch(() => {});
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        if ("requestIdleCallback" in window)
          requestIdleCallback(load, { timeout: 1000 });
        else setTimeout(load, 100);
      }
    },
    { rootMargin: "100px" },
  );
  observer.observe(stage);
})();
