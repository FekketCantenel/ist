import { postNewTaskTime } from "./ist.fn.api.js";
export { getAllTasks, getDueTasks, getSuggestTasksHTML };

function getAllTasks(todoistRawTasks) {
    let overdue = 0;
    $.each(todoistRawTasks, function(i, task) {
        if (task.due == null) {
            return true;
        }

        task.due.all_day = task.due.datetime ? 0 : 1;
        task.due.moment = moment(task.due.datetime || task.due.date).local();

        // check if task is overdue
        if (task.due.moment.isBefore(moment(), "day")) {
            overdue = 1;
        }

        // add notes
        // task.notes = _.filter(todoistRawNotes, function(note) {
        //     return note.item_id == task.id;
        // });
        /// TEMPORARY:
        task.notes = "";
    });

    if (overdue === 1) {
        $("#task").append("rescheduling overdue tasks, please wait...");
        deferOverdueTasks(todoistRawTasks);
    } else {
        return todoistRawTasks;
    }
}

function deferOverdueTasks(tasks) {
    let tasksToDefer = [];

    $.each(tasks, function(i, task) {
        if (task.due.moment.isBefore(moment(), "day")) {
            let taskNewMoment = moment(),
                taskNewDateString = "";

            if (task.due.all_day === 1) {
                taskNewDateString = taskNewMoment.format("YYYY-MM-DD");
            } else {
                if (/[AM|PM]$/.test(task.due.string)) {
                    let taskNewTime = task.due.string.split(" ");
                    taskNewTime = taskNewTime.slice(-2);
                    taskNewMoment = moment(taskNewTime, [
                        "hh:mma",
                        "hha",
                        "ha"
                    ]);

                    taskNewDateString = taskNewMoment.format(
                        "YYYY-MM-DDTHH:mm:ss"
                    );
                } else {
                    taskNewDateString = taskNewMoment.format(
                        "YYYY-MM-DDT05:00:00"
                    );
                }
            }

            tasksToDefer.push({
                id: task.id,
                string: task.due.string,
                date: taskNewDateString
            });
        }
    });
    postNewTaskTime(tasksToDefer);
}

function getDueTasks(allTasks) {
    let dueTasks = _.filter(allTasks, function(task) {
        if (task.due == null) {
            return false;
        }
        return task.due.moment.isBefore(moment(), "second");
    });

    dueTasks.sort(function(a, b) {
        let c = new Date(a.due.datetime || a.due.date),
            d = new Date(b.due.datetime || b.due.date);
        return c - d;
    });

    return dueTasks;
}

function getSuggestTasksHTML(allTasks, dueTasks, projects) {
    let suggestTasks = $("<div></div>").addClass("suggestTasks"),
        countedTasks = _.countBy(dueTasks, "project_id");

    $.each(projects, function(i, project) {
        project.count = countedTasks[project.id] || 0;

        if (project.count > 0) {
            let badgeHTML = $("<a>" + project.count + "</a>")
                .addClass("badge")
                .data("badge", project.count);

            let suggestTaskButton = $("<button></button>")
                .addClass("suggest")
                .attr("project.id", project.id)
                .html(project.name);

            ///// FIX THIS
            // let listURL =
            //     "<a class='suggestLink' href='https://todoist.com/app#agenda%2F(overdue | today) %26 %23" +
            //     list.special.content +
            //     "'>&#128279;</a>";

            suggestTaskButton.append(badgeHTML); // .append(listURL)

            suggestTasks.append(suggestTaskButton, $("<br />"));
        }
    });

    return suggestTasks;
}
