/* app.js - single-page controller: search, pagination, details, and the subject collection.
   Nothing here loads another page; sections are updated in place. */
$(document).ready(function () {
    "use strict";

    // ----- Settings -----
    var PER_PAGE = 10;                                   // books per page view
    var COLLECTION = { slug: "fantasy", label: "Fantasy" };   // the one predefined subject
    var COLLECTION_SIZE = 10;
    var MAX_TERM_LENGTH = 100;

    // ----- State (kept while the user selects books, so nothing is lost) -----
    var state = {
        term: "",
        books: [],          // up to 50 results of the last search
        total: 0,           // total matches reported by Open Library
        page: 1,
        selectedId: "",
        searching: false,
        detailsRequest: 0   // lets us ignore a slow response after a newer selection
    };
    var collectionBooks = [];

    // ----- Elements -----
    var $form = $("#search-form");
    var $input = $("#search-input");
    var $searchButton = $("#search-button");
    var $searchStatus = $("#search-status");
    var $resultsStatus = $("#results-status");
    var $summary = $("#results-summary");
    var $results = $("#results-list");
    var $pagination = $("#pagination");
    var $detailsStatus = $("#details-status");
    var $details = $("#details-panel");
    var $collectionStatus = $("#collection-status");
    var $collectionList = $("#collection-list");
    var $retry = $("#collection-retry");

    function say($el, message, isError) {
        $el.text(message).toggleClass("is-error", !!isError);
    }

    // ===== Search =====

    // Returns an error message, or "" when the input is fine
    function validate(term) {
        if (term === "") { return "Please enter a title or keywords to search for."; }
        if (term.length > MAX_TERM_LENGTH) { return "Please keep your search under " + MAX_TERM_LENGTH + " characters."; }
        if (!/[\p{L}\p{N}]/u.test(term)) { return "Please include at least one letter or number in your search."; }
        return "";
    }

    function setSearching(isSearching) {
        state.searching = isSearching;
        $searchButton.prop("disabled", isSearching).text(isSearching ? "Searching…" : "Search");
        $input.prop("disabled", isSearching);
        $form.attr("aria-busy", isSearching);
    }

    function clearResults() {
        $results.empty();
        $summary.text("");
        $pagination.empty().prop("hidden", true);
    }

    // Show one 10-book view of the stored results (no new request needed)
    function showPage(page) {
        var pageCount = Math.ceil(state.books.length / PER_PAGE);
        state.page = Math.min(Math.max(page, 1), pageCount);

        var start = (state.page - 1) * PER_PAGE;
        var view = state.books.slice(start, start + PER_PAGE);
        Render.bookList($results, view);
        markSelected();

        var summary = "Showing " + (start + 1) + "–" + (start + view.length) + " of " + state.books.length +
            " results for “" + state.term + "”";
        if (state.total > state.books.length) {
            summary += " (the first " + state.books.length + " of " + state.total.toLocaleString() + " matches)";
        }
        $summary.text(summary);
        Render.pagination($pagination, state.page, pageCount);
    }

    function runSearch(term) {
        setSearching(true);
        clearResults();
        say($searchStatus, "", false);
        say($resultsStatus, "Searching for “" + term + "”…", false);

        BookAPI.search(term)
            .done(function (data) {
                state.term = term;
                state.books = data.books;
                state.total = data.total;

                if (data.books.length === 0) {
                    say($resultsStatus, "No books matched “" + term + "”. Try different keywords.", false);
                    return;
                }
                say($resultsStatus, "", false);
                showPage(1);                      // every new search starts on page 1
            })
            .fail(function () {
                state.books = [];
                say($resultsStatus, "Sorry, the search could not be completed. Please check your connection and try again.", true);
            })
            .always(function () {
                setSearching(false);              // always restore the controls
            });
    }

    $form.on("submit", function (event) {
        event.preventDefault();
        if (state.searching) { return; }          // ignore overlapping submissions

        var term = $.trim($input.val());
        var problem = validate(term);
        if (problem) {
            say($searchStatus, problem, true);
            $input.trigger("focus");
            return;
        }
        runSearch(term);
    });

    // Page buttons (event delegation, because the buttons are rebuilt each time)
    $pagination.on("click", ".page-btn", function () {
        showPage(parseInt($(this).attr("data-page"), 10));
    });

    // ===== Details =====

    // Highlight the selected book wherever it appears (results and collection)
    function markSelected() {
        $(".book-item").each(function () {
            var isSelected = $(this).attr("data-id") === state.selectedId;
            $(this).toggleClass("is-selected", isSelected).attr("aria-pressed", isSelected);
        });
    }

    function findBook(id) {
        var all = state.books.concat(collectionBooks);
        for (var i = 0; i < all.length; i++) {
            if (all[i].id === id) { return all[i]; }
        }
        return null;
    }

    function selectBook(id) {
        var book = findBook(id);
        if (!book) { return; }

        state.selectedId = id;
        markSelected();
        var requestNumber = ++state.detailsRequest;

        $details.empty();
        say($detailsStatus, "Loading details for “" + book.title + "”…", false);

        BookAPI.details(book)
            .done(function (info) {
                if (requestNumber !== state.detailsRequest) { return; }   // a newer selection replaced this one
                say($detailsStatus, "", false);
                Render.details($details, info);
                document.getElementById("details-title").focus({ preventScroll: true });
                document.getElementById("details-section").scrollIntoView({ behavior: "smooth", block: "nearest" });
            })
            .fail(function () {
                if (requestNumber !== state.detailsRequest) { return; }
                say($detailsStatus, "Sorry, the details for “" + book.title + "” could not be loaded. Please select it again.", true);
            });
    }

    // One handler covers both the results and the collection
    $("#results-list, #collection-list").on("click", ".book-item", function () {
        selectBook($(this).attr("data-id"));
    });

    // ===== Predefined collection =====

    function loadCollection() {
        $retry.prop("hidden", true);
        $collectionList.empty();
        say($collectionStatus, "Loading the " + COLLECTION.label + " collection…", false);

        BookAPI.subject(COLLECTION.slug, COLLECTION_SIZE)
            .done(function (books) {
                collectionBooks = books;
                if (books.length === 0) {
                    say($collectionStatus, "The " + COLLECTION.label + " collection is empty right now.", false);
                    $retry.prop("hidden", false);
                    return;
                }
                say($collectionStatus, "", false);
                Render.bookList($collectionList, books);
                markSelected();
            })
            .fail(function () {
                say($collectionStatus, "The " + COLLECTION.label + " collection could not be loaded.", true);
                $retry.prop("hidden", false);
            });
    }

    $retry.on("click", loadCollection);

    // ===== Start =====
    $("#collection-heading").text("Collection: " + COLLECTION.label);
    loadCollection();
});
