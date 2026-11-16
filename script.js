(function () {
      "use strict";
      var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapter"));
      var pins = Array.prototype.slice.call(document.querySelectorAll("[data-pin]"));
      var routes = Array.prototype.slice.call(document.querySelectorAll("[data-route]"));
      var currentPlace = document.getElementById("current-place");
      var currentRegion = document.getElementById("current-region");
      var counter = document.getElementById("map-counter");
      var mapSvg = document.querySelector(".map-viewport svg");
      var zoomLabel = document.getElementById("zoom-level");
      var mapBody = document.getElementById("map-body");
      var mapToggle = document.getElementById("map-toggle");
      var mapDescription = document.getElementById("map-description");
      var mapReadLink = document.getElementById("map-read-link");
      var compactPlace = document.getElementById("compact-place");
      var activeIndex = -1;
      var zoom = 1;
      var viewX = 0;
      var viewY = 0;
      var viewWidth = 620;
      var viewHeight = 440;
      var drag = null;

      function activate(chapter) {
        var index = chapters.indexOf(chapter);
        if (index < 0 || index === activeIndex) return;
        activeIndex = index;
        chapters.forEach(function (item, itemIndex) {
          item.classList.toggle("is-active", itemIndex === index);
        });
        pins.forEach(function (pin) {
          var pinNumbers = pin.getAttribute("data-pin").split(" ").map(Number);
          var isActive = pinNumbers.indexOf(index + 1) !== -1;
          var isPast = pinNumbers.every(function (pinNumber) { return pinNumber > 0 && pinNumber < index + 1; });
          pin.classList.toggle("is-active", isActive);
          pin.classList.toggle("is-past", !isActive && isPast);
        });
        routes.forEach(function (route) {
          var routeNumber = Number(route.getAttribute("data-route"));
          route.classList.toggle("is-active", routeNumber === index + 1);
          route.classList.toggle("is-past", routeNumber < index + 1);
        });
        currentPlace.textContent = chapter.getAttribute("data-place");
        compactPlace.textContent = chapter.getAttribute("data-place");
        currentRegion.textContent = chapter.getAttribute("data-region");
        mapDescription.textContent = chapter.querySelector(".lead").textContent;
        mapReadLink.href = "#" + chapter.id;
        counter.textContent = "STOP " + String(index + 1).padStart(2, "0") + " / " + String(chapters.length).padStart(2, "0");
      }

      function renderMap() {
        viewWidth = 620 / zoom;
        viewHeight = 440 / zoom;
        viewX = Math.max(0, Math.min(620 - viewWidth, viewX));
        viewY = Math.max(0, Math.min(440 - viewHeight, viewY));
        mapSvg.setAttribute("viewBox", [viewX, viewY, viewWidth, viewHeight].join(" "));
        zoomLabel.textContent = Math.round(zoom * 100) + "%";
      }

      function setZoom(nextZoom, focusX, focusY) {
        var oldWidth = viewWidth;
        var oldHeight = viewHeight;
        var next = Math.max(1, Math.min(3, nextZoom));
        if (next === zoom) return;
        var relativeX = focusX === undefined ? .5 : focusX;
        var relativeY = focusY === undefined ? .5 : focusY;
        var centerX = viewX + oldWidth * relativeX;
        var centerY = viewY + oldHeight * relativeY;
        zoom = next;
        viewWidth = 620 / zoom;
        viewHeight = 440 / zoom;
        viewX = centerX - viewWidth * relativeX;
        viewY = centerY - viewHeight * relativeY;
        renderMap();
      }

      document.getElementById("zoom-in").addEventListener("click", function () { setZoom(zoom * 1.25); });
      document.getElementById("zoom-out").addEventListener("click", function () { setZoom(zoom / 1.25); });
      document.getElementById("zoom-reset").addEventListener("click", function () {
        zoom = 1;
        viewX = 0;
        viewY = 0;
        renderMap();
      });
      mapSvg.addEventListener("wheel", function (event) {
        event.preventDefault();
        var bounds = mapSvg.getBoundingClientRect();
        setZoom(zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15),
          (event.clientX - bounds.left) / bounds.width,
          (event.clientY - bounds.top) / bounds.height);
      }, { passive: false });
      mapSvg.addEventListener("pointerdown", function (event) {
        if (event.target.closest(".map-pin")) return;
        drag = { x: event.clientX, y: event.clientY, viewX: viewX, viewY: viewY };
        mapSvg.setPointerCapture(event.pointerId);
      });
      mapSvg.addEventListener("pointermove", function (event) {
        if (!drag) return;
        var bounds = mapSvg.getBoundingClientRect();
        viewX = drag.viewX - (event.clientX - drag.x) * viewWidth / bounds.width;
        viewY = drag.viewY - (event.clientY - drag.y) * viewHeight / bounds.height;
        renderMap();
      });
      mapSvg.addEventListener("pointerup", function () { drag = null; });
      mapSvg.addEventListener("pointercancel", function () { drag = null; });

      function openStoryFromPin(pin) {
        var chapter = document.getElementById(pin.getAttribute("data-story"));
        if (!chapter) return;
        chapter.scrollIntoView({ behavior: "smooth", block: "start" });
        chapter.setAttribute("tabindex", "-1");
        chapter.focus({ preventScroll: true });
      }
      pins.forEach(function (pin) {
        pin.addEventListener("click", function () { openStoryFromPin(pin); });
        pin.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openStoryFromPin(pin);
          }
        });
      });
      function setMapExpanded(expanded) {
        mapBody.hidden = !expanded;
        mapToggle.setAttribute("aria-expanded", String(expanded));
        mapToggle.textContent = expanded ? "Hide map" : "Show map";
        document.querySelector(".map-column").classList.toggle("is-collapsed",
          window.matchMedia("(max-width: 850px)").matches && !expanded);
      }
      mapToggle.addEventListener("click", function () {
        setMapExpanded(mapToggle.getAttribute("aria-expanded") !== "true");
      });
      var compactLayout = window.matchMedia("(max-width: 850px)");
      function updateMapLayout(event) { setMapExpanded(!event.matches); }
      updateMapLayout(compactLayout);
      if (compactLayout.addEventListener) compactLayout.addEventListener("change", updateMapLayout);
      else compactLayout.addListener(updateMapLayout);

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
          var visible = entries.filter(function (entry) { return entry.isIntersecting; });
          if (visible.length) {
            visible.sort(function (a, b) {
              return Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top);
            });
            activate(visible[0].target);
          }
        }, { rootMargin: "-34% 0px -44% 0px", threshold: 0 });
        chapters.forEach(function (chapter) { observer.observe(chapter); });
      } else {
        window.addEventListener("scroll", function () {
          var nearest = chapters.reduce(function (best, chapter) {
            var distance = Math.abs(chapter.getBoundingClientRect().top - window.innerHeight * .42);
            return distance < best.distance ? { chapter: chapter, distance: distance } : best;
          }, { chapter: chapters[0], distance: Infinity });
          activate(nearest.chapter);
        }, { passive: true });
      }
    }());
