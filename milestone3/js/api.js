/* api.js - everything that talks to Open Library (jQuery AJAX only).
   Each function returns a jQuery promise and hands back clean, normalized objects,
   so the rest of the app never has to know the raw API response shapes. */
var BookAPI = (function ($) {
    "use strict";

    var BASE = "https://openlibrary.org";            // HTTPS only
    var COVERS = "https://covers.openlibrary.org/b/id/";
    var MAX_RESULTS = 50;                            // most results we keep per search
    var TIMEOUT_MS = 15000;

    var detailsCache = {};                           // Work ID -> details already fetched

    function getJSON(url) {
        return $.ajax({ url: url, method: "GET", dataType: "json", timeout: TIMEOUT_MS });
    }

    // "/works/OL27448W" -> "OL27448W"; returns "" if the key is not a work key
    function workIdFromKey(key) {
        var match = /\/works\/(OL\d+W)$/i.exec(String(key || ""));
        return match ? match[1] : "";
    }

    // Search results use cover_i and author_name
    function fromSearchDoc(doc) {
        return {
            id: workIdFromKey(doc.key),
            title: doc.title || "Untitled",
            coverId: doc.cover_i > 0 ? doc.cover_i : null,
            authors: $.isArray(doc.author_name) ? doc.author_name : []
        };
    }

    // Subject results use cover_id and authors: [{ name }]
    function fromSubjectWork(work) {
        var names = [];
        $.each(work.authors || [], function (i, author) {
            if (author && author.name) { names.push(author.name); }
        });
        return {
            id: workIdFromKey(work.key),
            title: work.title || "Untitled",
            coverId: work.cover_id > 0 ? work.cover_id : null,
            authors: names
        };
    }

    function keepValid(books) {
        return $.grep(books, function (book) { return book.id !== ""; });
    }

    // Descriptions are either a string or an object like { type: "...", value: "..." }
    function readDescription(description) {
        if (typeof description === "string") { return $.trim(description); }
        if (description && typeof description.value === "string") { return $.trim(description.value); }
        return "";
    }

    // Work records list covers in a "covers" array (negative numbers are placeholders)
    function firstCoverId(covers) {
        if ($.isArray(covers)) {
            for (var i = 0; i < covers.length; i++) {
                if (covers[i] > 0) { return covers[i]; }
            }
        }
        return null;
    }

    return {
        COVERS: COVERS,
        MAX_RESULTS: MAX_RESULTS,
        workUrl: function (workId) { return BASE + "/works/" + encodeURIComponent(workId); },
        coverUrl: function (coverId, size) { return COVERS + encodeURIComponent(coverId) + "-" + size + ".jpg"; },

        // One request returns up to 50 books; the app paginates them locally.
        // Resolves with { total: <all matches>, books: [...] }
        search: function (term) {
            var url = BASE + "/search.json?q=" + encodeURIComponent(term) +
                "&limit=" + MAX_RESULTS + "&fields=key,title,cover_i,author_name";
            return getJSON(url).then(function (data) {
                var docs = $.isArray(data.docs) ? data.docs.slice(0, MAX_RESULTS) : [];
                return { total: data.numFound || 0, books: keepValid($.map(docs, fromSearchDoc)) };
            });
        },

        // Up to `limit` books from one subject. Resolves with an array of books.
        subject: function (slug, limit) {
            var url = BASE + "/subjects/" + encodeURIComponent(slug) + ".json?limit=" + limit;
            return getJSON(url).then(function (data) {
                var works = $.isArray(data.works) ? data.works.slice(0, limit) : [];
                return keepValid($.map(works, fromSubjectWork));
            });
        },

        // Full details for one work. Only called when a user selects a book,
        // and each result is cached so repeat selections need no new request.
        details: function (book) {
            if (detailsCache[book.id]) {
                return $.Deferred().resolve(detailsCache[book.id]).promise();
            }
            return getJSON(BASE + "/works/" + encodeURIComponent(book.id) + ".json").then(function (work) {
                var subjects = $.isArray(work.subjects) ? work.subjects.slice(0, 10) : [];
                var result = {
                    id: book.id,
                    title: work.title || book.title,
                    authors: book.authors,                         // reused from the list response
                    description: readDescription(work.description),
                    subjects: subjects,
                    coverId: firstCoverId(work.covers) || book.coverId
                };
                detailsCache[book.id] = result;
                return result;
            });
        }
    };
})(jQuery);
