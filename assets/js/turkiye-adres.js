// Turkey il/ilçe/mahalle helper — backed by the free, CORS-open
// api.turkiyeapi.dev public API (no key needed). Every lookup is cached
// in-memory per page load, and every call is wrapped so a network hiccup
// never breaks the form — callers get null back and fall through to a
// plain text field instead.
(function () {
  const API_BASE = 'https://api.turkiyeapi.dev/v1';

  const PROVINCES = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan',
    'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
    'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ',
    'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır',
    'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri',
    'Kilis', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
    'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun',
    'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak',
    'Van', 'Yalova', 'Yozgat', 'Zonguldak'
  ];

  const districtsCache = new Map(); // province name -> [{id, name}]
  const neighborhoodsCache = new Map(); // districtId -> [{id, name}]

  async function getDistricts(provinceName) {
    if (districtsCache.has(provinceName)) return districtsCache.get(provinceName);
    try {
      const res = await fetch(`${API_BASE}/provinces?name=${encodeURIComponent(provinceName)}`);
      if (!res.ok) return null;
      const json = await res.json();
      const districts = (json.data && json.data[0] && json.data[0].districts) || [];
      const sorted = districts.map(d => ({ id: d.id, name: d.name })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      districtsCache.set(provinceName, sorted);
      return sorted;
    } catch {
      return null;
    }
  }

  async function getNeighborhoods(districtId) {
    if (neighborhoodsCache.has(districtId)) return neighborhoodsCache.get(districtId);
    try {
      const res = await fetch(`${API_BASE}/neighborhoods?districtId=${encodeURIComponent(districtId)}`);
      if (!res.ok) return null;
      const json = await res.json();
      const names = (json.data || []).map(n => n.name).sort((a, b) => a.localeCompare(b, 'tr'));
      neighborhoodsCache.set(districtId, names);
      return names;
    } catch {
      return null;
    }
  }

  // wires up İl (a real <select>, always available) -> İlçe -> Mahalle
  // (both <input list=datalist>, so a slow/unreachable API degrades to
  // a plain text field instead of blocking the shopper entirely).
  function wireCascadingAddress({ ilSelect, ilceInput, ilceList, mahalleInput, mahalleList }) {
    if (ilSelect.options.length <= 1) {
      PROVINCES.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        ilSelect.appendChild(opt);
      });
    }

    let currentDistricts = [];
    let debounceTimer = null;

    async function loadDistricts(il, keepIlceValue) {
      if (!keepIlceValue) ilceInput.value = '';
      mahalleInput.value = '';
      ilceList.innerHTML = '';
      mahalleList.innerHTML = '';
      currentDistricts = [];
      if (!il) { ilceInput.disabled = true; mahalleInput.disabled = true; return; }
      ilceInput.disabled = false;
      mahalleInput.disabled = true;
      const districts = await getDistricts(il);
      if (districts) {
        currentDistricts = districts;
        districts.forEach((d) => {
          const opt = document.createElement('option');
          opt.value = d.name;
          ilceList.appendChild(opt);
        });
      }
    }

    async function loadNeighborhoods(keepMahalleValue) {
      if (!keepMahalleValue) mahalleInput.value = '';
      mahalleList.innerHTML = '';
      mahalleInput.disabled = false;
      const match = currentDistricts.find((d) => d.name === ilceInput.value);
      if (!match) return;
      const neighborhoods = await getNeighborhoods(match.id);
      if (neighborhoods) {
        neighborhoods.forEach((n) => {
          const opt = document.createElement('option');
          opt.value = n;
          mahalleList.appendChild(opt);
        });
      }
    }

    ilSelect.addEventListener('change', () => loadDistricts(ilSelect.value, false));
    ilceInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadNeighborhoods(false), 250);
    });

    return {
      // used when opening the edit form for an already-saved address —
      // fills the province, waits for its districts, fills the district,
      // waits for its neighborhoods, fills the neighborhood.
      async prefill(il, ilce, mahalle) {
        ilSelect.value = il || '';
        await loadDistricts(ilSelect.value, true);
        ilceInput.value = ilce || '';
        await loadNeighborhoods(true);
        mahalleInput.value = mahalle || '';
      }
    };
  }

  window.TR_ADDRESS = { PROVINCES, getDistricts, getNeighborhoods, wireCascadingAddress };
})();
