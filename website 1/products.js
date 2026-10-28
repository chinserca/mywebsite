(function () {
  const dialog = document.getElementById("productDetails");
  let opener;
  document.querySelectorAll(".catalog .card").forEach(function (card) {
    const art = card.querySelector(".product-art");
    const name = card.querySelector("h3").textContent;
    art.setAttribute("role", "button");
    art.setAttribute("tabindex", "0");
    art.setAttribute("aria-label", "View " + name + " details");
    art.setAttribute("aria-haspopup", "dialog");
    function openDetails() {
      opener = art;
      document.getElementById("productTitle").textContent = name;
      document.getElementById("productDescription").textContent = card.querySelector(":scope > p").textContent;
      document.getElementById("productPrice").textContent = card.querySelector(".product-info > span").textContent;
      dialog.showModal();
    }
    art.addEventListener("click", openDetails);
    art.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetails();
      }
    });
  });
  dialog.querySelectorAll("button").forEach(function (button) {
    button.addEventListener("click", function () { dialog.close(); });
  });
  dialog.addEventListener("close", function () { if (opener) opener.focus(); });
})();
