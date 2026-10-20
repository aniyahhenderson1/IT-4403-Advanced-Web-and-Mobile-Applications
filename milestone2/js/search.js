$(document).ready(function () {
    var PER_PAGE = 10;      // results shown per page
    var MAX_RESULTS = 60;   // never show more than this many in total

    var currentTerm = "";   // the term from the last submitted search (kept while changing pages)
    var latestRequest = 0;  // lets us ignore out-of-date responses

    var $form = $("#search-form");
    var $input = $("#search-input");
    var $status = $("#status");
    var $results = $("#results");
    var $summary = $("#summary");
    var $pagination = $("#pagination");
    var $pageSelect = $("#page-select");
    var $pageTotal = $("#page-total");

    function clearResults() {
        $results.empty();
        $summary.text("");
        $pagination.prop("hidden", true);
    }

    // Build the request URL from the search term and page number
    function buildUrl(term, page) {
        return OL.API + "/search.json?q=" + encodeURIComponent(term) +
            "&limit=" + PER_PAGE + "&page=" + page +
            "&fields=key,title,cover_i,author_name";
    }

    function loadPage(term, page) {
        var requestId = ++latestRequest;
        clearResults();
        OL.showStatus($status, "Searching for “" + term + "”…", false);

        $.ajax({ url: buildUrl(term, page), dataType: "json", timeout: 15000 })
            .done(function (data) {
                if (requestId !== latestRequest) { return; }   // a newer search replaced this one
                showResults(term, page, data);
            })
            .fail(function () {
                if (requestId !== latestRequest) { return; }
                OL.showStatus($status, "Sorry, the search could not be completed. Please check your connection and try again.", true);
            });
    }

    function showResults(term, page, data) {
        var found = data.numFound || 0;
        var total = Math.min(found, MAX_RESULTS);

        if (total === 0 || !data.docs || data.docs.length === 0) {
            OL.showStatus($status, "No books found for “" + term + "”. Try a different search term.", false);
            return;
        }
        OL.showStatus($status, "", false);

        // Only show what is left under the 60-result cap (fewer if fewer exist)
        var firstNumber = (page - 1) * PER_PAGE + 1;
        var remaining = total - (firstNumber - 1);
        var count = Math.min(data.docs.length, remaining);

        for (var i = 0; i < count; i++) {
            var doc = data.docs[i];
            var author = doc.author_name && doc.author_name.length ? doc.author_name[0] : "";
            $results.append(OL.bookItem(OL.workIdFromKey(doc.key), doc.title, doc.cover_i, author));
        }

        var lastNumber = firstNumber + count - 1;
        var summary = "Showing " + firstNumber + "–" + lastNumber + " of " + total + " results";
        if (found > total) {
            summary += " (the first " + MAX_RESULTS + " of " + found.toLocaleString() + " matches)";
        }
        $summary.text(summary);

        buildPagination(Math.ceil(total / PER_PAGE), page);
    }

    // Dropdown of page numbers
    function buildPagination(pageCount, currentPage) {
        $pageSelect.empty();
        for (var p = 1; p <= pageCount; p++) {
            $pageSelect.append($("<option>").val(p).text(p));
        }
        $pageSelect.val(currentPage);
        $pageTotal.text("of " + pageCount);
        $pagination.prop("hidden", pageCount <= 1);
    }

    // New search: always starts on page 1
    $form.on("submit", function (event) {
        event.preventDefault();
        var term = $.trim($input.val());
        if (term === "") {
            currentTerm = "";
            latestRequest++;
            clearResults();
            OL.showStatus($status, "Please enter a search term.", true);
            $input.trigger("focus");
            return;
        }
        currentTerm = term;
        loadPage(currentTerm, 1);
    });

    // Changing the page keeps the same search term
    $pageSelect.on("change", function () {
        loadPage(currentTerm, parseInt($(this).val(), 10));
        $("#results-heading")[0].scrollIntoView({ behavior: "smooth" });
    });
});
