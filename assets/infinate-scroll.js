"use strict";

function InfiniteScroll(config) {
  var settings = config || {};
  var defaultSettings = {
    pagination: "#AjaxinatePagination",
    method: "scroll",
    container: "#AjaxinateLoop",
    offset: 0,
    loadingText: "Loading",
    callback: null,
  };
  // Merge configs
  this.settings = Object.assign(defaultSettings, settings);

  // Bind 'this' to applicable prototype functions
  this.addScrollListeners = this.addScrollListeners.bind(this);
  this.addClickListener = this.addClickListener.bind(this);
  this.checkIfPaginationInView = this.checkIfPaginationInView.bind(this);
  this.handleIntersection = this.handleIntersection.bind(this);
  this.stopMultipleClicks = this.stopMultipleClicks.bind(this);
  this.destroy = this.destroy.bind(this);

  // Set up our element selectors
  this.containerElement = document.querySelector(this.settings.container);
  this.paginationElement = document.querySelector(this.settings.pagination);

  this.loadedPages = [];
  this.scrollPosition = 0;

  window.addEventListener("popstate", this.handlePopState.bind(this));

  this.initialize();
}

InfiniteScroll.prototype.initialize =
  function initializeTheCorrectFunctionsBasedOnTheMethod() {
    // Find and initialise the correct function based on the method set in the config
    if (this.containerElement) {
      var initializers = {
        click: this.addClickListener,
        scroll: this.addScrollListeners,
      };
      initializers[this.settings.method]();
    }
  };

InfiniteScroll.prototype.handlePopState = function handlePopState() {
  this.loadedPages.forEach((pageUrl) => {
    this.nextPageUrl = pageUrl;
    this.loadMore();
  });

  // Restore scroll position
  window.scrollTo(0, this.scrollPosition);
};

InfiniteScroll.prototype.addScrollListeners =
  function addEventListenersForScrolling() {
    if (this.paginationElement) {
      document.addEventListener("scroll", this.checkIfPaginationInView);
      window.addEventListener("resize", this.checkIfPaginationInView);
      window.addEventListener(
        "orientationchange",
        this.checkIfPaginationInView
      );
    }
  };

InfiniteScroll.prototype.addClickListener =
  function addEventListenerForClicking() {
    if (this.paginationElement) {
      this.nextPageLinkElement = this.paginationElement.querySelector("a");
      this.clickActive = true;
      if (this.nextPageLinkElement !== null) {
        this.nextPageLinkElement.addEventListener(
          "click",
          this.stopMultipleClicks
        );
      }
    }
  };

InfiniteScroll.prototype.stopMultipleClicks = function handleClickEvent(event) {
  event.preventDefault();
  if (this.clickActive) {
    this.nextPageLinkElement.innerHTML = this.settings.loadingText;
    this.nextPageUrl = this.nextPageLinkElement.href;
    this.clickActive = false;
    this.loadMore();
  }
};

InfiniteScroll.prototype.checkIfPaginationInView =
  function AddIntersectionObserver() {
    if (!this.isLoading && this.paginationElement) {
      var options = {
        root: null,
        rootMargin: this.settings.offset + "px",
        threshold: 0.1, // Adjust as needed
      };

      this.isLoading = true; // Set loading flag

      this.intersectionObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        options
      );
      this.intersectionObserver.observe(this.paginationElement);
    }
  };

InfiniteScroll.prototype.handleIntersection = function (entries, observer) {
  entries.forEach((entry) => {
    console.log(entry)
    if (entry.isIntersecting) {
      this.nextPageLinkElement = this.paginationElement.querySelector("a");
      this.removeScrollListener();
      if (this.nextPageLinkElement) {
        this.nextPageLinkElement.innerHTML = this.settings.loadingText;
        this.nextPageUrl = this.nextPageLinkElement.href;
        this.loadMore();
      }
      observer.unobserve(entry.target);
    }
  });
};

InfiniteScroll.prototype.loadMore =
  async function getTheHtmlOfTheNextPageWithAnAjaxRequest() {
    try {
      const response = await fetch(this.nextPageUrl);
      const fetchedData = await response.text();
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(fetchedData, "text/html");

      const newContainer = newDoc.querySelector(this.settings.container);
      const newPagination = newDoc.querySelector(this.settings.pagination);

      this.containerElement.insertAdjacentHTML(
        "beforeend",
        newContainer.innerHTML
      );

      if (newPagination) {
        // New pagination exists
        this.paginationElement.innerHTML = newPagination.innerHTML;

        if (
          this.settings.callback &&
          typeof this.settings.callback === "function"
        ) {
          this.settings.callback(newDoc);
        }
        this.loadedPages.push(this.nextPageUrl); // Add the URL to loadedPages
        this.initialize();
      } else {
        // No new pagination, you might want to handle this case
        console.warn("No new pagination found.");
      }
    } catch (error) {
      console.error("Error during fetch:", error);
    } finally {
      this.isLoading = false; // Reset loading flag
      this.scrollPosition = window.scrollY;
      sessionStorage.setItem("scrollPosition", this.scrollPosition.toString());
    }
  };

InfiniteScroll.prototype.removeClickListener =
  function removeClickEventListener() {
    this.nextPageLinkElement.addEventListener("click", this.stopMultipleClicks);
  };

InfiniteScroll.prototype.removeScrollListener =
  function removeScrollEventListener() {
    document.removeEventListener("scroll", this.checkIfPaginationInView);
    window.removeEventListener("resize", this.checkIfPaginationInView);
    window.removeEventListener(
      "orientationchange",
      this.checkIfPaginationInView
    );
  };

InfiniteScroll.prototype.destroy =
  function removeEventListenersAndReturnThis() {
    // This method is used to unbind event listeners from the DOM
    // This function is called manually to destroy "this" InfiniteScroll instance
    var destroyers = {
      click: this.removeClickListener,
      scroll: this.removeScrollListener,
    };
    destroyers[this.settings.method]();
    return this;
  };
