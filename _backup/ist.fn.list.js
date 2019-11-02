export { getAllTasks, getDueTasks, getSuggestTasksHTML };

function getAllTasks(todoistRawTasks, todoistRawNotes) {
    $.each(todoistRawTasks, function(i, task) {
        // add notes
        task.notes = _.filter(todoistRawNotes, function(note) {
            return note.item_id == task.id;
        });

        // add special code values, remove them from notes
        let codeNote = _.find(task.notes, function(note) {
            return note.content.charAt(0) == "~";
        });

        task.special = {};
        if (codeNote !== undefined) {
            task.notes = _.reject(task.notes, function(note) {
                return note.id == codeNote.id;
            });
            let codes = codeNote.content.split("~");
            task.special.type = codes[1];
            task.special.content = codes[2];
            task.special.list_id = Number(codes[3]);
            task.special.emoji = codes[4];
        }

        if (task.due == undefined) {
            task.due = {};
        }

        // add due.all_day value
        task.due.all_day =
            task.due.date != undefined && task.due.date.indexOf("T") == -1
                ? new Date(task.due.date).getTime()
                : 0;
    });
    return todoistRawTasks;
}

function getDueTasks(fullTasks) {
    let offsetHours = new Date().getTimezoneOffset(),
        offsetMS = offsetHours * 60000,
        nowMS = new Date().getTime(),
        dueTasks = _.filter(fullTasks, function(task) {
            if (task.due !== null) {
                let taskMS = new Date(task.due.date).getTime();

                if (
                    task.due.date != undefined &&
                    task.due.date.indexOf("T") == -1
                ) {
                    taskMS += offsetMS;
                }

                return taskMS < nowMS;
            } else {
                return false;
            }
        });

    dueTasks.sort(function(a, b) {
        let c = new Date(a.due.date),
            d = new Date(b.due.date);
        return c - d;
    });

    return dueTasks;
}

function getSuggestTasksHTML(allTasks, dueTasks) {
    let suggestTasks = $("<div></div>").addClass("suggestTasks"),
        masterTasks = _.filter(allTasks, function(task) {
            return task.special.type == "M";
        });

    $.each(masterTasks, function(i, list) {
        let subTaskCount = dueTasks.reduce(function(n, task) {
                return n + (task.project_id === list.special.list_id);
            }, 0),
            badgeHTML = "";

        if (subTaskCount > 0) {
            badgeHTML = $("<a>" + subTaskCount + "</a>")
                .addClass("badge")
                .data("badge", subTaskCount);
        }
        let suggestTaskButton = $("<button></button>")
            .addClass("suggest")
            .attr("taskID", list.id)
            .html(
                "&#x1F" + list.special.emoji + "<br />" + list.special.content
            );

        if (
            new Date().toDateString() !== new Date(list.due.date).toDateString()
        ) {
            suggestTaskButton.addClass("grey");
        }

        suggestTasks.append(suggestTaskButton).append(badgeHTML);
    });

    return suggestTasks;
}
