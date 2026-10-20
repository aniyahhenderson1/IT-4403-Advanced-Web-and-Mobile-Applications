$(document).ready(function () {
    var $status = $("#status");
    var $book = $("#book");

    // Descriptions can be a plain string or an object like { type: "...", value: "..." }
    function readDescription(description) {
        if (typeof description === "string") {
            return description;
        }
        if (description && typeof description.value === "string") {
            return description.value;
        }
        return "";
    }

    function showBook(workId, work) {
        var title = work.title || "Untitled";
        var description = $.trim(readDescription(work.description));
        var subjects = $.isArray(work.subjects) ? work.subjects.slice(0, 10) : [];
        var coverId = OL.firstCoverId(work.covers);
        var openLibraryUrl = OL.API + "/works/" + encodeURIComponent(workId);

        document.title = title + " | Book Details";

        var $info = $("<div>").addClass("info");
        $info.append($("<h2>").text(title));
        $info.append($("<p>").addClass("meta").append("Work ID: ", $("<code>").text(workId)));

        $info.append($("<h3>").text("Description"));
        $info.append(
            description
                ? $("<p>").addClass("description").text(description)
                : $("<p>").addClass("description is-missing").text("No description is available for this book.")
        );

        $info.append($("<h3>").text("Subjects"));
        if (subjects.length) {
            var $list = $("<ul>").addClass("subjects");
            for (var i = 0; i < subjects.length; i++) {
                $list.append($("<li>").text(subjects[i]));
            }
            $info.append($list);
        } else {
            $info.append($("<p>").addClass("description is-missing").text("No subjects are listed for this book."));
        }

        $info.append(
            $("<div>").addClass("actions").append(
                $("<a>").addClass("btn").attr({ href: openLibraryUrl, target: "_blank", rel: "noopener" })
                    .text("View on Open Library"),
                $("<a>").addClass("btn btn--ghost").attr("href", "index.html").text("Back to search")
            )
        );

        $book.empty().append(OL.coverElement(coverId, "M", title), $info).prop("hidden", false);
        OL.showStatus($status, "", false);
    }

    // Read the Work ID from the address, e.g. details.html?id=OL17422847W
    var workId = new URLSearchParams(window.location.search).get("id");

    if (!workId) {
        OL.showStatus($status, "No book was selected. Search for a book or open one from My Bookshelf.", true);
    } else if (!/^OL\d+W$/i.test(workId)) {
        OL.showStatus($status, "That doesn’t look like a valid Work ID.", true);
    } else {
        OL.showStatus($status, "Loading book details…", false);
        $.ajax({ url: OL.API + "/works/" + encodeURIComponent(workId) + ".json", dataType: "json", timeout: 15000 })
            .done(function (work) { showBook(workId, work); })
            .fail(function (xhr) {
                if (xhr.status === 404) {
                    OL.showStatus($status, "No book was found for Work ID " + workId + ".", true);
                } else {
                    OL.showStatus($status, "Sorry, the book details could not be loaded. Please try again.", true);
                }
            });
    }
});
