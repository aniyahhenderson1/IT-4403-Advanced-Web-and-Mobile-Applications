$(document).ready(function () {
    var bookshelfIds = [
        "OL27448W",      // The Lord of the Rings
        "OL18417W",     // The Wizard of OZ
        "OL82563W",      // Harry Potter and the Philosopher's Stone
        "OL45804W",      // Fantastic Mr Fox
        "OL17422847W"    // Example
    ];

    var $list = $("#shelf");
    var $status = $("#status");
    var failures = 0;
    var pending = bookshelfIds.length;   // requests still running

    OL.showStatus($status, "Loading your bookshelf…", false);

    // Create one list slot per ID first so the books always stay in array order
    $.each(bookshelfIds, function (index, workId) {
        var $slot = $("<li>").addClass("book-item").text("Loading " + workId + "…").appendTo($list);

        $.ajax({ url: OL.API + "/works/" + encodeURIComponent(workId) + ".json", dataType: "json", timeout: 15000 })
            .done(function (work) {
                $slot.replaceWith(OL.bookItem(workId, work.title, OL.firstCoverId(work.covers), ""));
            })
            .fail(function () {
                failures++;
                $slot.addClass("is-error").text("Could not load book " + workId + ".");
            })
            .always(function () {
                // Update the status line once every request has finished
                pending--;
                if (pending > 0) { return; }
                if (failures === 0) {
                    OL.showStatus($status, "", false);
                } else {
                    OL.showStatus($status, failures + " of " + bookshelfIds.length + " books could not be loaded. Please try again later.", true);
                }
            });
    });
});
