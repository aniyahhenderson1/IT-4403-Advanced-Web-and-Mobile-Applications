/* render.js - builds HTML for lists, pagination, and details.
   All text goes through .text(), so API data can never inject markup. */
var Render = (function ($) {
    "use strict";

    var PLACEHOLDER_TEXT = "No cover available";

    function coverPlaceholder(size) {
        return $("<div>").addClass("cover cover--empty" + (size === "M" ? " cover--medium" : ""))
            .text(PLACEHOLDER_TEXT);
    }

    // A cover <img>, or a text placeholder when there is no cover or it fails to load
    function cover(coverId, size, title) {
        if (!coverId) { return coverPlaceholder(size); }
        return $("<img>")
            .addClass("cover" + (size === "M" ? " cover--medium" : ""))
            .attr({ src: BookAPI.coverUrl(coverId, size), alt: "Cover of " + title, loading: "lazy" })
            .on("error", function () { $(this).replaceWith(coverPlaceholder(size)); });
    }

    // One selectable book. Search results and the collection both use this, so they look identical.
    function bookItem(book) {
        var $text = $("<span>").addClass("book-text")
            .append($("<span>").addClass("book-title").text(book.title));
        if (book.authors.length) {
            $text.append($("<span>").addClass("book-author").text(book.authors.join(", ")));
        }
        var $button = $("<button>").attr("type", "button").addClass("book-item")
            .attr("data-id", book.id)
            .append(cover(book.coverId, "S", book.title), $text);
        return $("<li>").append($button);
    }

    function bookList($list, books) {
        $list.empty();
        $.each(books, function (i, book) { $list.append(bookItem(book)); });
    }

    // Page buttons plus "Page X of Y"
    function pagination($nav, page, pageCount) {
        $nav.empty();
        if (pageCount < 1) { $nav.prop("hidden", true); return; }

        function pageButton(label, target, disabled) {
            return $("<button>").attr({ type: "button", "data-page": target }).addClass("page-btn")
                .text(label).prop("disabled", disabled);
        }

        var $buttons = $("<div>").addClass("page-buttons")
            .append(pageButton("Previous", page - 1, page === 1));
        for (var p = 1; p <= pageCount; p++) {
            var $b = pageButton(String(p), p, false).attr("aria-label", "Go to page " + p);
            if (p === page) { $b.addClass("is-current").attr("aria-current", "page"); }
            $buttons.append($b);
        }
        $buttons.append(pageButton("Next", page + 1, page === pageCount));

        $nav.append($buttons, $("<p>").addClass("page-status").text("Page " + page + " of " + pageCount))
            .prop("hidden", false);
    }

    // The details panel, with a fallback message for anything missing
    function details($panel, info) {
        var $info = $("<div>").addClass("details-info");

        $info.append($("<h3>").attr("id", "details-title").attr("tabindex", "-1").text(info.title));
        $info.append($("<p>").addClass("meta").append("Work ID: ", $("<code>").text(info.id)));

        $info.append($("<h4>").text("Author"));
        $info.append(info.authors.length
            ? $("<p>").text(info.authors.join(", "))
            : $("<p>").addClass("missing").text("Author information is not available."));

        $info.append($("<h4>").text("Description"));
        $info.append(info.description
            ? $("<p>").addClass("description").text(info.description)
            : $("<p>").addClass("missing").text("No description is available for this book."));

        $info.append($("<h4>").text("Subjects"));
        if (info.subjects.length) {
            var $subjects = $("<ul>").addClass("subjects");
            $.each(info.subjects, function (i, subject) { $subjects.append($("<li>").text(subject)); });
            $info.append($subjects);
        } else {
            $info.append($("<p>").addClass("missing").text("No subjects are listed for this book."));
        }

        $info.append($("<a>").addClass("btn").attr({ href: BookAPI.workUrl(info.id), target: "_blank", rel: "noopener" })
            .text("View on Open Library"));

        $panel.empty().append(
            $("<div>").addClass("details-layout").append(cover(info.coverId, "M", info.title), $info)
        );
    }

    return { bookList: bookList, pagination: pagination, details: details };
})(jQuery);
