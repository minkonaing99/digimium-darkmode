(() => {
  "use strict";

  // ====== Config ======
  const API = {
    list: "api/products_table.php",
    insert: "api/product_insertion.php",
    update: "api/product_update.php",
    delete: "api/product_delete.php",
  };
  const COLSPAN = 9;

  // ====== DOM refs ======
  const $ = (id) => document.getElementById(id);
  const tbody = $("product_table");

  // Add form
  const addForm = document.querySelector("#inputRow form");
  const addEls = addForm
    ? {
        form: addForm,
        product: $("product"),
        duration: $("duration"),
        supplier: $("supplier"),

        notes: $("notes"),
        link: $("link"),
        wc_price: $("wc_price"),
        retail_price: $("retail_price"),
        saveBtn: addForm.querySelector('button[type="submit"]'),
        feedback: $("feedback_addProduct"),
      }
    : null;

  // Edit form
  const editForm = $("editForm");
  const editEls = editForm
    ? {
        form: editForm,
        id: $("edit_product_id"),
        product: $("edit_product"),
        duration: $("edit_duration"),
        supplier: $("edit_supplier"),

        notes: $("edit_notes"),
        link: $("edit_link"),
        wc_price: $("edit_wc_price"),
        retail_price: $("edit_retail_price"),
        saveBtn: editForm.querySelector('button[type="submit"]'),
        feedback: $("feedback_editProduct"),
      }
    : null;

  // ====== Utils ======
  function setDanger(el, on) {
    if (!el) return;
    el.classList.toggle("text-danger", !!on);
    const label = el.id
      ? document.querySelector(`label[for="${el.id}"]`)
      : null;
    if (label) label.classList.toggle("text-danger", !!on);
  }
  const toInt = (v) =>
    v === "" || v == null ? NaN : Number.isInteger(+v) ? +v : NaN;
  const toMoney = (v) =>
    v === "" || v == null
      ? NaN
      : Number.isFinite(+v)
      ? Math.round(+v * 100) / 100
      : NaN;

  // Put this with your utils
  function stripDurationSuffix(name) {
    // remove one or more trailing " - 3M" or "(3m)" suffixes, case-insensitive
    return (name || "")
      .replace(/\s*(?:-\s*\d+\s*M|\(\s*\d+\s*m\s*\))+$/i, "")
      .trim();
  }

  function formatProductName(rawName, duration) {
    const base = (rawName || "").replace(/\s*\(\s*\d+\s*m\s*\)$/i, "").trim();
    return `${base} - ${duration}M`;
  }
  function normalizeLink(s) {
    const v = (s || "").trim();
    if (!v) return null;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }
  function formatKyat(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "-";
    return (
      new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
        Math.round(num)
      ) + " Ks"
    );
  }
  const svgTrash = () =>
    `<span class="era-icon"><img src="./assets/delete.svg" alt=""></span>`;
  const svgEdit = () =>
    `<span class="era-icon"><img src="./assets/edit.svg" alt=""></span>`;

  // ====== Validation (shared) ======
  function validateProductForm(refs, { formatName = true } = {}) {
    const errors = {};

    const productRaw = (refs.product?.value || "").trim();
    if (!productRaw) errors.product = true;
    setDanger(refs.product, !productRaw);

    const duration = toInt(refs.duration?.value);
    if (!Number.isInteger(duration) || duration < 1) {
      errors.duration = true;
      setDanger(refs.duration, true);
    } else setDanger(refs.duration, false);

    const wc_price = toMoney(refs.wc_price?.value);
    if (!Number.isFinite(wc_price) || wc_price < 0) {
      errors.wc_price = true;
      setDanger(refs.wc_price, true);
    } else setDanger(refs.wc_price, false);

    const retail_price = toMoney(refs.retail_price?.value);
    if (!Number.isFinite(retail_price) || !(retail_price > wc_price)) {
      errors.retail_price = true;
      setDanger(refs.retail_price, true);
    } else setDanger(refs.retail_price, false);

    const valid = Object.keys(errors).length === 0;

    if (refs.saveBtn) {
      refs.saveBtn.disabled = !valid;
      refs.saveBtn.classList.toggle("disableBtn", !valid);
    }

    const product_name = formatName
      ? formatProductName(productRaw, duration)
      : productRaw;

    const payload = valid
      ? {
          product_name,
          duration,

          supplier: (refs.supplier?.value || "").trim() || null,
          wc_price,
          retail_price,
          notes: (refs.notes?.value || "").trim() || null,
          link: normalizeLink(refs.link?.value),
        }
      : null;

    return { valid, payload };
  }

  function attachValidation(refs, validator) {
    ["input", "blur"].forEach((evt) => {
      refs.product?.addEventListener(evt, validator);
      refs.duration?.addEventListener(evt, validator);
      refs.wc_price?.addEventListener(evt, validator);
      refs.retail_price?.addEventListener(evt, validator);
    });
    validator(); // initial
  }

  // ====== Table render ======
  function placeholderRow(text) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.className = "era-muted";
    td.colSpan = COLSPAN;
    td.textContent = text;
    tr.appendChild(td);
    return tr;
  }

  function renderRows(rows) {
    tbody.innerHTML = "";
    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.appendChild(placeholderRow("No products found."));
      return;
    }
    const frag = document.createDocumentFragment();

    rows.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.className = "era-row";
      if (p.product_id != null) tr.dataset.id = String(p.product_id);

      const tdNum = document.createElement("td");
      tdNum.className = "era-num";
      tdNum.textContent = String(i + 1);

      const tdProduct = document.createElement("td");
      tdProduct.className = "era-product";
      tdProduct.textContent = p.product_name ?? "-";

      const tdDur = document.createElement("td");
      tdDur.className = "era-dur";
      const badge = document.createElement("span");
      badge.className = "era-badge";
      badge.textContent = (p.duration ?? "-") + "";
      tdDur.appendChild(badge);

      const tdSupplier = document.createElement("td");
      tdSupplier.className = "era-supplier";
      tdSupplier.textContent = p.supplier ?? "-";

      const tdNotes = document.createElement("td");
      tdNotes.className = "era-muted column-hide";
      tdNotes.title = p.notes ?? "";
      tdNotes.textContent = p.notes ?? "-";

      const tdLink = document.createElement("td");
      tdLink.className = "era-muted column-hide";
      tdLink.textContent = p.link ? p.link : "-";

      const tdWcPrice = document.createElement("td");
      tdWcPrice.className = "era-price";
      tdWcPrice.textContent = formatKyat(p.wc_price);

      const tdRetailPrice = document.createElement("td");
      tdRetailPrice.className = "era-price";
      tdRetailPrice.textContent = formatKyat(p.retail_price);

      const tdActions = document.createElement("td");
      tdActions.className = "era-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "era-icon-btn";
      editBtn.type = "button";
      editBtn.title = "Edit";
      editBtn.setAttribute("aria-label", `Edit row ${i + 1}`);
      editBtn.innerHTML = svgEdit();
      editBtn.addEventListener("click", () => openEditForm(p));

      const delBtn = document.createElement("button");
      delBtn.className = "era-icon-btn";
      delBtn.type = "button";
      delBtn.dataset.action = "delete";
      delBtn.title = "Delete";
      delBtn.setAttribute("aria-label", `Delete row ${i + 1}`);
      delBtn.innerHTML = svgTrash();

      tdActions.append(editBtn, delBtn);

      tr.append(
        tdNum,
        tdProduct,
        tdDur,
        tdSupplier,
        tdNotes,
        tdLink,
        tdWcPrice,
        tdRetailPrice,
        tdActions
      );
      frag.appendChild(tr);
    });

    tbody.appendChild(frag);
  }

  async function loadProducts() {
    tbody.innerHTML = "";
    tbody.appendChild(placeholderRow("Loading…"));
    try {
      const r = await fetch(API.list, {
        headers: { Accept: "application/json" },
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.success)
        throw new Error(json.error || `HTTP ${r.status}`);
      renderRows(json.data || []);
    } catch (err) {
      console.error("Failed to load products:", err);
      tbody.innerHTML = "";
      tbody.appendChild(placeholderRow(`Failed to load: ${err.message}`));
    }
  }
  function renumberRows() {
    tbody.querySelectorAll("tr.era-row").forEach((tr, idx) => {
      const cell = tr.querySelector(".era-num");
      if (cell) cell.textContent = String(idx + 1);
    });
  }

  // ====== Delete (delegated) ======
  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest('button.era-icon-btn[data-action="delete"]');
    if (!btn) return;
    const tr = btn.closest("tr.era-row");
    if (!tr) return;
    const id = Number(tr.dataset.id);
    if (!id) return alert("Missing product_id for this row.");

    const name =
      tr.querySelector(".era-product")?.textContent?.trim() || `#${id}`;
    if (!confirm(`Delete "${name}"?\nThis cannot be undone.`)) return;

    btn.disabled = true;
    btn.classList.add("disableBtn");
    try {
      const resp = await fetch(API.delete, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json.success)
        throw new Error(json.error || `HTTP ${resp.status}`);
      tr.remove();
      if (!tbody.querySelector("tr.era-row")) {
        tbody.innerHTML = "";
        tbody.appendChild(placeholderRow("No products found."));
      } else {
        renumberRows();
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(`Delete failed: ${err.message}`);
      btn.disabled = false;
      btn.classList.remove("disableBtn");
    }
  });

  // ====== Add form wiring ======
  if (addEls) {
    const validateAdd = () => validateProductForm(addEls, { formatName: true });
    attachValidation(addEls, validateAdd);

    addEls.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { valid, payload } = validateAdd();
      if (!valid) return;

      try {
        if (addEls.feedback) {
          addEls.feedback.style.display = "block";
          addEls.feedback.style.color = "";
          addEls.feedback.textContent = "Saving...";
        }
        addEls.saveBtn.disabled = true;
        addEls.saveBtn.classList.add("disableBtn");

        const resp = await fetch(API.insert, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.success)
          throw new Error(data.error || `HTTP ${resp.status}`);

        // success
        addEls.form.reset();

        validateAdd();
        if (addEls.feedback) {
          addEls.feedback.textContent = "Successfully Saved";
          addEls.feedback.style.color = "white";
        }
        setTimeout(() => {
          if (addEls.feedback) addEls.feedback.style.display = "none";
          const addSec = $("addProductForm");
          if (addSec) addSec.style.display = "none";
          if (typeof window.refreshProductsTable === "function")
            window.refreshProductsTable();
        }, 800);
      } catch (err) {
        console.error("Save failed:", err);
        if (addEls.feedback) {
          addEls.feedback.style.display = "block";
          addEls.feedback.style.color = "red";
          addEls.feedback.textContent = `Save failed: ${err.message}`;
        }
      } finally {
        addEls.saveBtn.disabled = false;
        addEls.saveBtn.classList.remove("disableBtn");
      }
    });
  }

  // ====== Edit form wiring + openEditForm ======
  if (editEls) {
    const validateEdit = () => {
      const { valid, payload } = validateProductForm(editEls, {
        formatName: true,
      });
      if (payload) payload.id = Number(editEls.id.value);
      return { valid, payload };
    };
    attachValidation(editEls, validateEdit);

    window.openEditForm = function openEditForm(p) {
      const editSec = $("editProductForm"),
        addSec = $("addProductForm"),
        userSec = $("user_setting");
      if (addSec) addSec.style.display = "none";
      if (userSec) userSec.style.display = "none";
      if (editSec) editSec.style.display = "block";

      editEls.id.value = p.product_id ?? "";
      editEls.product.value = stripDurationSuffix(p.product_name ?? "");
      editEls.duration.value = p.duration ?? "";
      editEls.supplier.value = p.supplier ?? "";

      editEls.notes.value = p.notes ?? "";
      editEls.link.value = p.link ?? "";
      editEls.wc_price.value = p.wc_price ?? "";
      editEls.retail_price.value = p.retail_price ?? "";

      validateEdit();
    };

    editEls.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { valid, payload } = validateEdit();
      if (!valid) return;

      try {
        if (editEls.feedback) {
          editEls.feedback.style.display = "block";
          editEls.feedback.style.color = "";
          editEls.feedback.textContent = "Saving...";
        }
        editEls.saveBtn.disabled = true;
        editEls.saveBtn.classList.add("disableBtn");

        const res = await fetch(API.update, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));

        if (res.status === 422) {
          const msg = json.errors
            ? Object.values(json.errors).join(" | ")
            : "Validation failed.";
          throw new Error(msg);
        }
        if (!res.ok || !json.success)
          throw new Error(json.error || `HTTP ${res.status}`);

        if (editEls.feedback)
          editEls.feedback.textContent = "Successfully Saved";
        setTimeout(() => {
          if (editEls.feedback) editEls.feedback.style.display = "none";
          const editSec = $("editProductForm");
          if (editSec) editSec.style.display = "none";
          if (typeof window.refreshProductsTable === "function")
            window.refreshProductsTable();
        }, 800);
      } catch (err) {
        console.error("Update failed:", err);
        if (editEls.feedback) {
          editEls.feedback.style.display = "block";
          editEls.feedback.style.color = "red";
          editEls.feedback.textContent = `Save failed: ${err.message}`;
        }
      } finally {
        editEls.saveBtn.disabled = false;
        editEls.saveBtn.classList.remove("disableBtn");
      }
    });
  }

  // ====== Initial load ======
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadProducts);
  } else {
    loadProducts();
  }

  // exposed for external calls
  window.refreshProductsTable = loadProducts;
})();
