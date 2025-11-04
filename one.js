// one.js — Full updated script (USD -> INR conversion, working search, buy, catalog)
window.addEventListener("DOMContentLoaded", () => {
  // ---------- CONFIG ----------
  const USD_TO_INR = 83; // adjust conversion rate here

  // ---------- STATE ----------
  let RAW_JSON = [];
  let filteredCars = [];
  let picked = [];

  // ---------- ELEMENTS ----------
  const carGrid = document.getElementById("carGrid");
  const countPill = document.getElementById("countPill");
  const compareArea = document.getElementById("compareArea");
  const suggestBox = document.getElementById("suggestBox");
  const suggestTitle = document.getElementById("suggestTitle");
  const suggestWhy = document.getElementById("suggestWhy");
  const suggestDetails = document.getElementById("suggestDetails");
  const qInput = document.getElementById("q");
  const fuelSelect = document.getElementById("fuel");
  const priceInput = document.getElementById("priceMax");
  const searchBtn = document.getElementById("searchBtn");
  const compareBtn = document.getElementById("compareBtn");

  // ---------- UTIL ----------
  function parsePriceFromString(s) {
    if (s == null) return 0;
    const digits = String(s).replace(/[^0-9]/g, "");
    const n = Number(digits);
    return Number.isNaN(n) ? 0 : n;
  }
  function formatRupee(n) {
    if (!n && n !== 0) return "₹0";
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  // ---------- RENDER ----------
  function renderCars(list) {
    carGrid.innerHTML = "";
    if (!list || list.length === 0) {
      carGrid.innerHTML = `<p style="color:#95a3b3;text-align:center;margin-top:20px">No cars found</p>`;
      return;
    }

    list.forEach((car, idx) => {
      const card = document.createElement("div");
      card.className = "car-card";
      card.dataset.idx = idx;

      const isPicked = picked.includes(car);

      const usdDisplay = car.usd && car.usd > 0 ? `$${car.usd.toLocaleString()}` : "";
      const priceDisplay = car.priceINR ? formatRupee(car.priceINR) : (usdDisplay ? `${usdDisplay}` : "");

      card.innerHTML = `
        <img src="${car.image}" alt="${escapeHtml(car.model || car.id)}" onclick="openLightbox('${escapeHtmlAttr(car.image)}')">
        <div class="meta">
          <h4>${escapeHtml(car.brand || "")} ${escapeHtml(car.model || "")}</h4>
          <span class="tag">${escapeHtml(car.fuel || "")}</span>
          <div class="price" style="margin-top:8px;font-weight:600">${priceDisplay}${usdDisplay && car.priceINR ? ` <small style="opacity:.7">(${usdDisplay})</small>` : ''}</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:center;padding:12px;">
          <button class="pick-btn ${isPicked ? "active" : ""}" data-idx="${idx}">${isPicked ? "Picked" : "Pick"}</button>
          <button class="buy-btn" data-idx="${idx}">Buy</button>
        </div>
      `;

      carGrid.appendChild(card);
    });

    carGrid.querySelectorAll(".pick-btn").forEach(btn => {
      btn.onclick = () => togglePick(Number(btn.dataset.idx));
    });
    carGrid.querySelectorAll(".buy-btn").forEach(btn => {
      btn.onclick = () => buyCar(Number(btn.dataset.idx));
    });
  }

  // ---------- HELPERS ----------
  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }
  function escapeHtmlAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  // ---------- PICK ----------
  function togglePick(idx) {
    const car = filteredCars[idx];
    if (!car) return;
    if (picked.includes(car)) {
      picked = picked.filter(c => c !== car);
    } else {
      if (picked.length >= 3) {
        alert("You can only pick up to 3 cars!");
        return;
      }
      picked.push(car);
    }
    countPill.textContent = `${picked.length} selected`;
    renderCars(filteredCars);
    compareArea.innerHTML = "";
    suggestBox.style.display = "none";
  }

  // ---------- LOCAL STORAGE CATALOG ----------
  function addToCatalog(car) {
    try {
      const key = "myCatalog";
      const raw = JSON.parse(localStorage.getItem(key) || "[]");
      const entry = {
        id: car.id || (car.brand + "-" + car.model),
        brand: car.brand,
        model: car.model,
        usd: car.usd || 0,
        priceINR: car.priceINR || 0,
        image: car.image || "",
        raw: car.raw || {},
        addedAt: Date.now()
      };
      raw.push(entry);
      localStorage.setItem(key, JSON.stringify(raw));
      return entry;
    } catch (err) {
      console.error("Failed to write catalog to localStorage", err);
      return null;
    }
  }
  window.addToCatalog = addToCatalog;

  // ---------- BUY ----------
  function buyCar(idx) {
    const car = filteredCars[idx];
    if (!car) return;
    const entry = addToCatalog(car);
    if (!entry) {
      alert("Could not add to catalog.");
      return;
    }
    localStorage.setItem("lastPurchase", JSON.stringify({ id: entry.id, ts: entry.addedAt }));
    const url = `purchase.html?car=${encodeURIComponent(entry.id)}`;
    window.location.href = url;
  }

  // ---------- FILTERS ----------
  function applyFilters() {
    const q = qInput.value.trim().toLowerCase();
    const fuel = (fuelSelect && fuelSelect.value) ? fuelSelect.value : "all";
    const priceMax = priceInput && priceInput.value !== "" ? Number(priceInput.value) : Infinity;

    filteredCars = RAW_JSON.filter(car => {
      const brand = (car.brand || "").toString().toLowerCase();
      const model = (car.model || "").toString().toLowerCase();
      const id = (car.id || "").toString().toLowerCase();
      const rawName = (car.raw && (car.raw["Cars Names"] || car.raw.name) || "").toString().toLowerCase();
      const rawBrand = (car.raw && (car.raw["Company Names"] || car.raw.brand) || "").toString().toLowerCase();

      const matchesSearch = q === "" ||
        brand.includes(q) ||
        model.includes(q) ||
        id.includes(q) ||
        rawName.includes(q) ||
        rawBrand.includes(q);

      const matchesFuel = fuel === "all" || (car.fuel || "").toLowerCase() === fuel.toLowerCase();
      const priceINR = Number(car.priceINR || 0);
      const matchesPrice = priceINR <= priceMax;

      return matchesSearch && matchesFuel && matchesPrice;
    });

    renderCars(filteredCars);

    if (q && filteredCars.length > 0) {
      const firstCard = carGrid.querySelector('.car-card[data-idx="0"]');
      if (firstCard) {
        firstCard.scrollIntoView({ behavior: "smooth", block: "center" });
        firstCard.style.outline = "3px solid rgba(0,200,255,0.6)";
        setTimeout(() => { firstCard.style.outline = ""; }, 1800);
      }
    }
  }

  // ---------- COMPARE & SUGGEST ----------
  function compareCars() {
    if (picked.length < 2) {
      alert("Pick at least 2 cars to compare!");
      return;
    }
    const wSafety = Number(document.getElementById("wSafety").value) || 0;
    const wMileage = Number(document.getElementById("wMileage").value) || 0;
    const wPerf = Number(document.getElementById("wPerf").value) || 0;
    const wPrice = Number(document.getElementById("wPrice").value) || 0;

    const total = wSafety + wMileage + wPerf + wPrice || 1;
    const weights = {
      safety: wSafety / total,
      mileage: wMileage / total,
      performance: wPerf / total,
      price: wPrice / total,
    };

    const maxSafety = Math.max(...picked.map(c => parseFloat(c.safety) || 0)) || 1;
    const maxMileage = Math.max(...picked.map(c => parseFloat(c.mileage) || 0)) || 1;
    const maxPerformance = Math.max(...picked.map(c => parseFloat(c.performance) || 0)) || 1;
    const minPrice = Math.min(...picked.map(c => parseFloat(c.priceINR) || Infinity)) || 1;

    const scores = picked.map(car => {
      const safetyScore = (parseFloat(car.safety) || 0) / maxSafety * 100;
      const mileageScore = (parseFloat(car.mileage) || 0) / maxMileage * 100;
      const performanceScore = (parseFloat(car.performance) || 0) / maxPerformance * 100;
      const priceScore = minPrice / (parseFloat(car.priceINR) || 1) * 100;

      const score =
        safetyScore * weights.safety +
        mileageScore * weights.mileage +
        performanceScore * weights.performance +
        priceScore * weights.price;

      return { car, score, safety: car.safety, mileage: car.mileage, performance: car.performance, priceINR: car.priceINR };
    });

    scores.sort((a, b) => b.score - a.score);

    let html = `<table style="width:100%;border-collapse:collapse;">
      <tr style="text-align:left"><th>Car</th><th>Safety</th><th>Mileage</th><th>Performance</th><th>Price</th></tr>`;
    scores.forEach(s => {
      html += `<tr>
        <td>${escapeHtml(s.car.brand)} ${escapeHtml(s.car.model)}</td>
        <td>${s.safety}</td>
        <td>${s.mileage}</td>
        <td>${s.performance}</td>
        <td>${formatRupee(s.priceINR)}</td>
      </tr>`;
    });
    html += `</table>`;
    compareArea.innerHTML = html;

    const best = scores[0].car;
    suggestBox.style.display = "block";
    suggestTitle.textContent = `We Suggest: ${best.brand} ${best.model}`;
    suggestWhy.textContent = `Based on your selected weights, this car scores highest.`;

    suggestDetails.innerHTML = `
      <img src="${escapeHtmlAttr(best.image)}" alt="${escapeHtml(best.model)}" class="suggest-img" onclick="openLightbox('${escapeHtmlAttr(best.image)}')">
      <ul style="margin-top:10px;">
        <li><b>Engine:</b> ${escapeHtml(best.raw?.Engines || "N/A")}</li>
        <li><b>Capacity:</b> ${escapeHtml(best.raw?.["CC/Battery Capacity"] || "N/A")}</li>
        <li><b>HorsePower:</b> ${escapeHtml(best.raw?.HorsePower || "N/A")}</li>
        <li><b>Top Speed:</b> ${escapeHtml(best.raw?.["Total Speed"] || "N/A")}</li>
        <li><b>0-100 km/h:</b> ${escapeHtml(best.raw?.["Performance(0 - 100 )KM/H"] || "N/A")}</li>
        <li><b>Seats:</b> ${escapeHtml(String(best.raw?.Seats || "N/A"))}</li>
        <li><b>Torque:</b> ${escapeHtml(best.raw?.Torque || "N/A")}</li>
        <li><b>Price:</b> ${best.priceINR ? formatRupee(best.priceINR) : (best.usd ? `$${best.usd}` : "N/A")}</li>
      </ul>
      <div style="margin-top:10px">
        <button id="suggestBuyBtn" class="btn">Buy Now</button>
      </div>
    `;

    const suggestBuyBtn = document.getElementById("suggestBuyBtn");
    if (suggestBuyBtn) {
      suggestBuyBtn.onclick = () => {
        const entry = addToCatalog(best);
        localStorage.setItem("lastPurchase", JSON.stringify({ id: entry.id, ts: entry.addedAt }));
        window.location.href = `purchase.html?car=${encodeURIComponent(entry.id)}`;
      };
    }
  }

  // ---------- LIGHTBOX ----------
  window.openLightbox = function (src) {
    const lightbox = document.createElement("div");
    lightbox.id = "lightbox";
    lightbox.style.position = "fixed";
    lightbox.style.top = "0";
    lightbox.style.left = "0";
    lightbox.style.width = "100%";
    lightbox.style.height = "100%";
    lightbox.style.background = "rgba(0,0,0,0.8)";
    lightbox.style.display = "flex";
    lightbox.style.alignItems = "center";
    lightbox.style.justifyContent = "center";
    lightbox.style.zIndex = "9999";
    lightbox.innerHTML = `<img src="${escapeHtmlAttr(src)}" class="lightbox-img" style="max-width:90%;max-height:90%;">`;
    lightbox.addEventListener("click", () => {
      document.body.removeChild(lightbox);
    });
    document.body.appendChild(lightbox);
  };

  // ---------- SCROLL HELPER ----------
  window.scrollCars = function (dir) {
    const grid = document.getElementById("carGrid");
    if (!grid) return;
    grid.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  // ---------- UI HOOKS ----------
  if (searchBtn) {
    searchBtn.addEventListener("click", applyFilters);
  }
  if (qInput) {
    qInput.addEventListener("keyup", (e) => { if (e.key === "Enter") applyFilters(); });
  }
  if (fuelSelect) fuelSelect.addEventListener("change", applyFilters);
  if (priceInput) priceInput.addEventListener("input", applyFilters);
  if (compareBtn) compareBtn.addEventListener("click", compareCars);

  // ---------- LOAD JSON ----------
  const jsonFiles = ["car.json"];
  Promise.all(jsonFiles.map(file => fetch(file).then(res => res.json())))
    .then(results => {
      RAW_JSON = results.flat().map(car => {
        const usd = parsePriceFromString(car["Cars Prices"] || car.price || car["Price"] || 0);
        const priceINR = usd * USD_TO_INR;

        return {
          id: ((car["Cars Names"] || car.name || "") + "-" + (car["Company Names"] || car.brand || "")).trim(),
          brand: car["Company Names"] || car.brand || "Unknown",
          model: car["Cars Names"] || car.name || "Unknown",
          fuel: car["Fuel Types"] || car.fuel || "Unknown",
          usd: usd,
          priceINR: priceINR,
          price: priceINR,
          safety: Number(car["Safety"] ?? car["safety"] ?? 0),
          mileage: car["CC/Battery Capacity"] ? parseInt(String(car["CC/Battery Capacity"]).replace(/[^0-9]/g, ""))/100 : (car.mileage || 15),
          performance: car["HorsePower"] ? parseInt(String(car["HorsePower"]).replace(/[^0-9]/g, "")) : (car.performance || 70),
          image: car.image || car.img || "https://via.placeholder.com/300x200?text=Car+Image",
          raw: car
        };
      });

      filteredCars = RAW_JSON.slice();
      renderCars(filteredCars);
      applyFilters();
    })
    .catch(err => {
      console.error("Error loading JSON files:", err);
      if (carGrid) carGrid.innerHTML = `<p style="color:#f00;text-align:center;margin-top:20px">Failed to load data</p>`;
    });

});

// ---------- USER CATALOG ----------
function getUserCars() {
  return JSON.parse(localStorage.getItem("userCars") || "[]");
}
function setUserCars(cars) {
  localStorage.setItem("userCars", JSON.stringify(cars));
}

const checkoutBtn = document.getElementById("checkoutBtn");
checkoutBtn?.addEventListener("click", () => {
  if (!picked || picked.length === 0) {
    alert("Please pick at least one car before checkout!");
    return;
  }
  localStorage.setItem("myCatalog", JSON.stringify(picked));
  window.location.href = "purchase.html";
});

// ---------- CHATBOT ----------
window.openChatbot = function () {
  document.getElementById("chatbotBox").style.display = "flex";
};
window.closeChatbot = function () {
  document.getElementById("chatbotBox").style.display = "none";
};
window.sendChat = function () {
  const input = document.getElementById("chatInput");
  const chatContent = document.getElementById("chatContent");
  const msg = input.value.trim().toLowerCase();
  if (!msg) return;

  const userMsg = document.createElement("div");
  userMsg.textContent = "You: " + msg;
  userMsg.style.margin = "6px 0";
  userMsg.style.fontWeight = "500";
  chatContent.appendChild(userMsg);

  let reply = "I can help you explore cars by fuel type, price, safety, and performance!";
  if (msg.includes("electric")) reply = "Electric cars are eco-friendly and cost-efficient. Check out our EV options!";
  else if (msg.includes("diesel")) reply = "Diesel cars are powerful and fuel-efficient on highways.";
  else if (msg.includes("petrol")) reply = "Petrol cars are affordable and good for city driving.";
  else if (msg.includes("budget") || msg.includes("cheap") || msg.includes("low price")) reply = "Set your budget filter in ₹ to explore the best options.";
  else if (msg.includes("mileage")) reply = "Mileage is key! Hybrid and Diesel cars usually offer better mileage.";
  else if (msg.includes("performance") || msg.includes("speed")) reply = "Performance cars give thrilling speed but can be pricey.";
  else if (msg.includes("safety")) reply = "Safety first! Look for cars with high safety ratings and airbags.";
  else if (msg.includes("best") || msg.includes("suggest")) reply = "Pick up to 3 cars and click Compare Now — I'll suggest the best option.";
  else if (msg.includes("good morning") || msg.includes("gm")) reply = "Good morning! Ready to explore some cars?";
  else if (msg.includes("good afternoon") || msg.includes("ga")) reply = "Good afternoon! Let's find your perfect car.";
  else if (msg.includes("good evening") || msg.includes("ge")) reply = "Good evening! Looking for a new car today?";
  else if (msg.includes("good night") || msg.includes("gn")) reply = "Good night! Don't forget to check out tomorrow's car deals.";

  const botMsg = document.createElement("div");
  botMsg.textContent = "AI Car Advisor: " + reply;
  botMsg.style.margin = "6px 0";
  botMsg.style.color = "#0077b6";
  chatContent.appendChild(botMsg);

  chatContent.scrollTop = chatContent.scrollHeight;
  input.value = "";
};

// ---------- MODAL / AUTH ----------
const modal = document.getElementById("authModal");
const authBtn = document.getElementById("authBtn");
const closeBtn = document.querySelector(".close");
const logoutBtn = document.getElementById("logoutBtn");
const myCatalogLinks = document.querySelectorAll(".myCatalogLink");

// Switch tabs
function switchTab(tab) {
  document.querySelectorAll(".tab-link").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));

  document.querySelector(`.tab-link[onclick="switchTab('${tab}')"]`).classList.add("active");
  document.getElementById(tab + "Form").classList.add("active");
}

// Register
function registerUser() {
  const user = document.getElementById("regUser").value.trim();
  const pass = document.getElementById("regPass").value.trim();

  if (user && pass) {
    localStorage.setItem("user_" + user, pass);
    alert("Registration successful! Please login.");
    switchTab("login");
  } else {
    alert("Enter username and password.");
  }
}

// Login
function loginUser() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const storedPass = localStorage.getItem("user_" + user);

  if (storedPass && storedPass === pass) {
    localStorage.setItem("loggedInUser", user);
    alert("Login successful!");
    modal.style.display = "none";
    updateUI();
  } else {
    alert("Invalid username or password.");
  }
}

// Logout
logoutBtn.onclick = () => {
  localStorage.removeItem("loggedInUser");
  alert("Logged out!");
  updateUI();
};

// Update UI
function updateUI() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    myCatalogLinks.forEach(link => link.style.display = "inline-block");
    logoutBtn.style.display = "inline-block";
    authBtn.style.display = "none";
  } else {
    myCatalogLinks.forEach(link => link.style.display = "none");
    logoutBtn.style.display = "none";
    authBtn.style.display = "inline-block";
  }
}

// ---------- LOGIN MODAL FIX ----------
updateUI(); // ensures correct state on load
authBtn.onclick = () => {
  if (!localStorage.getItem("loggedInUser")) {
    modal.style.display = "block";
  }
};
closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
