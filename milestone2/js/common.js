var OL = {
    API: "https://openlibrary.org",
    COVERS: "https://covers.openlibrary.org/b/id/",

    // "/works/OL17422847W" -> "OL17422847W"
    workIdFromKey: function (key) {
        return String(key).split("/").pop();
    },

    // Link to the Book Details page, passing the Work ID
    detailsUrl: function (workId) {
        return "details.html?id=" + encodeURIComponent(workId);
    },

    // size: "S" (small) or "M" (medium)
    coverUrl: function (coverId, size) {
        return OL.COVERS + encodeURIComponent(coverId) + "-" + size + ".jpg";
    },

    // Returns a cover <img>, or a text placeholder when there is no cover (or it fails to load)
    coverElement: function (coverId, size, altText) {
        var sizeClass = size === "M" ? " cover--medium" : "";
        function placeholder() {
            return $("<div>").addClass("cover cover--empty" + sizeClass).text("No cover available");
        }
        if (!coverId) {
            return placeholder();
        }
        return $("<img>")
            .addClass("cover" + sizeClass)
            .attr({ src: OL.coverUrl(coverId, size), alt: "Cover of " + altText, loading: "lazy" })
            .on("error", function () { $(this).replaceWith(placeholder()); });
    },

    // One book entry, used by both the search results and the bookshelf
    bookItem: function (workId, title, coverId, author) {
        var $info = $("<div>").addClass("info").append(
            $("<a>").addClass("title").attr("href", OL.detailsUrl(workId)).text(title || "Untitled")
        );
        if (author) {
            $info.append($("<p>").addClass("author").text(author));
        }
        return $("<li>").addClass("book-item")
            .append(OL.coverElement(coverId, "S", title || "this book"))
            .append($info);
    },

    // First usable cover ID from a work record's "covers" array (negative IDs are placeholders)
    firstCoverId: function (covers) {
        if ($.isArray(covers)) {
            for (var i = 0; i < covers.length; i++) {
                if (covers[i] > 0) {
                    return covers[i];
                }
            }
        }
        return null;
    },

    // Show a message in a status element
    showStatus: function ($el, message, isError) {
        $el.text(message).toggleClass("is-error", !!isError);
    }
};
