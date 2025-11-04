/// purchase.js — handles purchase page with catalog, remove, select & Buy Now
window.addEventListener("DOMContentLoaded", () => {
    const purchaseArea = document.getElementById("purchaseArea");
    const catalogList = document.getElementById("catalogList");
    const checkoutBtn = document.getElementById("checkoutBtn");

    // --- LocalStorage helpers ---
    const getCatalog = () => JSON.parse(localStorage.getItem("myCatalog") || "[]");
    const setCatalog = arr => localStorage.setItem("myCatalog", JSON.stringify(arr));
    const setSelectedCars = ids => localStorage.setItem("selectedCars", JSON.stringify(ids));

    // --- Render single purchase if ?car=ID ---
    function renderPurchase() {
        const urlParams = new URLSearchParams(window.location.search);
        const carId = urlParams.get("car");
        if(!carId) {
            purchaseArea.innerHTML = `<p style="color:#999">No specific car selected. Browse your catalog below.</p>`;
            return;
        }

        const catalog = getCatalog();
        const car = catalog.find(c => String(c.id) === String(carId));
        if(!car) {
            purchaseArea.innerHTML = `<p style="color:#999">Car not found in catalog.</p>`;
            return;
        }

        // ✅ Fix price extraction from "Cars Prices"
        let rawPrice = car.raw?.["Cars Prices"] || car["Cars Prices"] || "$10000";
        rawPrice = String(rawPrice).replace(/[^0-9.]/g, ""); // remove $ and commas
        const usdPrice = parseFloat(rawPrice) || 10000;
        const priceInr = Math.round(usdPrice * 83);

        const gst = Math.round(priceInr*0.18);
        const ins = Math.round(priceInr*0.03);
        const total = priceInr+gst+ins;

        purchaseArea.innerHTML = `
        <div class="purchase-card">
            <img src="${car.image}" alt="${car.model}">
            <div>
                <h3>${car.brand} ${car.model}</h3>
                <p><b>Base Price:</b> ₹${priceInr.toLocaleString()}</p>
                <p><b>Fuel:</b> ${car.raw?.["Fuel Types"]||"N/A"}</p>
                <p><b>Engine:</b> ${car.raw?.Engines||"N/A"}</p>
                <button class="btn-buy" data-id="${car.id}">Buy Now</button>
            </div>
            <div class="breakdown">
                <h4>Price Breakdown</h4>
                <p>Base Price: ₹${priceInr.toLocaleString()}</p>
                <p>GST (18%): ₹${gst.toLocaleString()}</p>
                <p>Insurance (5%): ₹${ins.toLocaleString()}</p>
                <hr>
                <p><b>Total: ₹${total.toLocaleString()}</b></p>
            </div>
        </div>`;

        // --- ✅ Buy Now button inside purchase card ---
        const buyBtn = purchaseArea.querySelector(".btn-buy");
        if (buyBtn) {
            buyBtn.addEventListener("click", () => {
                const id = buyBtn.dataset.id;
                setSelectedCars([id]); // overwrite selection — only this car
                window.location.href = "checkout.html";
            });
        }
    }

    // --- Render catalog with checkboxes + Buy Now ---
    function renderCatalog() {
        const catalog = getCatalog();
        catalogList.innerHTML = "";
        if(catalog.length === 0) {
            catalogList.innerHTML = `<p style="color:#888;text-align:center;">No cars in your catalog</p>`;
            return;
        }

        catalog.forEach((car, idx) => {
            const div = document.createElement("div");
            div.className = "catalog-item";
            div.innerHTML = `
            <img src="${car.image}" alt="${car.model}">
            <div style="flex:1">
                <h4>${car.brand} ${car.model}</h4>
                <label>
                  <input type="checkbox" class="select-car" data-idx="${idx}" ${car.selected?"checked":""}>
                  Select for Checkout
                </label>
            </div>
            <button class="btn-buy" data-id="${car.id}">Buy Now</button>
            <button class="remove-btn" data-idx="${idx}">❌</button>`;
            catalogList.appendChild(div);
        });

        // --- Handlers ---
        // Checkbox
        catalogList.querySelectorAll(".select-car").forEach(cb => {
            cb.addEventListener("change", () => {
                const idx = Number(cb.dataset.idx);
                const arr = getCatalog();
                arr[idx].selected = cb.checked;
                setCatalog(arr);
            });
        });

        // Buy Now
        catalogList.querySelectorAll(".btn-buy").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                setSelectedCars([id]); // overwrite selection — only this car
                window.location.href = "checkout.html";
            });
        });

        // Remove
        catalogList.querySelectorAll(".remove-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = Number(btn.dataset.idx);
                const arr = getCatalog();
                arr.splice(idx,1);
                setCatalog(arr);
                renderCatalog();
                renderPurchase();
            });
        });
    }

    // --- Checkout button ---
    checkoutBtn.addEventListener("click", ()=>{
        const selected = getCatalog().filter(c=>c.selected).map(c=>c.id);
        if(selected.length === 0){
            alert("Please select at least one car to checkout!");
            return;
        }
        setSelectedCars(selected);
        window.location.href = "checkout.html";
    });

    renderPurchase();
    renderCatalog();
});
