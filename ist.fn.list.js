import { postNewTaskTime } from "./ist.fn.api.js";
export { getAllTasks, getDueTasks, getSuggestTasksHTML };

function getAllTasks(todoistRawTasks) {
    $.each(todoistRawTasks, function(i, task) {
        if (task.due == null) {
            return true;
        }

        task.due.all_day =
            task.due.date != undefined && task.due.date.indexOf("T") == -1
                ? new Date(task.due.date).getTime()
                : 0;
        task.due.moment = moment(task.due.datetime || task.due.date).local();

        // check if task is overdue
        if (task.due.moment.isBefore(moment(), "day")) {
            // MOVE THIS ALL TO EXTERNAL FUNCTION
            $("#task").append("rescheduling overdue tasks, please wait...");

            let taskNewMoment = moment(),
                taskNewDateString = "";
            if (task.due.all_day != 0) {
                taskNewDateString = taskNewMoment.format("YYYY-MM-DD");
                console.log("all-day - " + taskNewDateString); ////
            } else {
                if (/[am|pm]$/.test(task.due.string)) {
                    let taskNewTime = task.due.string.split(" ");
                    taskNewTime = taskNewTime[taskNewTime.length - 1];
                    taskNewMoment = moment(taskNewTime, [
                        "hh:mma",
                        "hha",
                        "ha"
                    ]);

                    taskNewDateString = taskNewMoment.format(
                        "YYYY-MM-DDTHH:mm:ss"
                    );
                    console.log("am / pm - " + taskNewDateString); ////
                } else {
                    taskNewDateString = taskNewMoment.format(
                        "YYYY-MM-DDT05:00:00"
                    );
                    console.log("others  - " + taskNewDateString); ////
                }
            }

            postNewTaskTime(task.id, task.due.string, taskNewDateString);
        }

        // add notes
        // task.notes = _.filter(todoistRawNotes, function(note) {
        //     return note.item_id == task.id;
        // });
        /// TEMPORARY:
        task.notes = "";

        ////////// REMOVE THIS
        // add special code values, remove them from notes
        let codeNote = _.find(task.notes, function(note) {
            return note.content.charAt(0) == "~";
        });

        task.special = {};
        if (codeNote !== undefined) {
            ////////////// UPDATE THIS
            task.notes = _.reject(task.notes, function(note) {
                return note.id == codeNote.id;
            });
            let codes = codeNote.content.split("~");
            task.special.type = codes[1];
            task.special.content = codes[2];
            task.special.list_id = Number(codes[3]);
            task.special.emoji = codes[4];
        }
    });
    return todoistRawTasks;
}

function getDueTasks(allTasks) {
    let dueTasks = _.filter(allTasks, function(task) {
        if (task.due == null) {
            return false;
        }
        return task.due.moment.isBefore(moment(), "second");
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
            return task.special && task.special.type == "M";
        });

    masterTasks.sort(function(a, b) {
        let c = new Date(a.priority),
            d = new Date(b.priority);
        return d - c;
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

        if (list.due.moment.isAfter(moment(), "day")) {
            suggestTaskButton.addClass("grey");
        }

        let listURL =
            "<a class='suggestLink' href='https://todoist.com/app#agenda%2F(overdue | today) %26 %23" +
            list.special.content +
            "'>&#128279;</a>";

        suggestTaskButton.append(badgeHTML).append(listURL);

        suggestTasks.append(suggestTaskButton);
    });

    return suggestTasks;
}
