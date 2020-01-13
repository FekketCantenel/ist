import { postNewTaskTime } from "./ist.fn.api.js";
import { getTaskRepeatMoment } from "./ist.fn.task.js";
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
    });

    if (overdue === 1) {
        $("#task").append("rescheduling overdue tasks, please wait...");
        deferOverdueTasks(todoistRawTasks);
        return "overdue";
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
                taskNewMoment = getTaskRepeatMoment(task);
                taskNewDateString = taskNewMoment.format("YYYY-MM-DDTHH:mm:ss");
            }

            tasksToDefer.push({
                id: task.id,
                string: task.due.string,
                date: taskNewDateString
            });
        }
        if (tasksToDefer.count == 99) {
            return false;
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
        if (project.name.slice(project.name.length - 1) === "_") {
            return true;
        }

        project.count = countedTasks[project.id] || 0;

        if (project.count > 0) {
            let badgeHTML = $("<a>" + project.count + "</a>")
                .addClass("badge")
                .data("badge", project.count);

            let suggestTaskButton = $("<button></button>")
                .addClass("suggest")
                .attr("project.id", project.id)
                .html(project.name);

            let projectURL =
                "<a class='projectLink' target='_blank' href='https://todoist.com/app#agenda%2F(overdue | today) %26 %23" +
                project.name +
                "'>&#128279;</a>" +
                "<a class='projectLinkMobile' target='_blank' href='todoist://project?id=" +
                project.id +
                "'>&#128279;</a>";

            suggestTaskButton.append(badgeHTML);

            suggestTasks.append(suggestTaskButton, projectURL, $("<br />"));
        }
    });

    return suggestTasks;
}
