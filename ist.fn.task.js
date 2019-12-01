export { getHighestPriorityTask, getSubTask, getTaskHTML, getTaskNotesHTML };

function getHighestPriorityTask(dueTasks, project) {
    let task = {};
    $.each([4, 3, 2, 1], function(i, priority) {
        task = _.findWhere(dueTasks, {
            priority,
            project_id: project.id
        });

        return task == undefined;
    });
    return task;
}

function getTaskButtonHTML(taskID, taskClasses, emoji, href) {
    return $("<a>")
        .addClass(`roundbutton ${taskClasses}`)
        .html(emoji)
        .attr("href", href)
        .attr("taskID", taskID);
}

function getTaskHTML(task, projects) {
    let taskID = task.id,
        converter = new showdown.Converter(),
        project = projects.find(({ id }) => id === Number(task.project_id)),
        taskName = converter.makeHtml(task.content),
        taskHTML = $("<div></div>"),
        priorityEmojis = {
            1: "&#x26AB;", // black
            2: "&#x1F535;", // blue
            3: "&#x1F34A;", // tangerine
            4: "&#x1F534;" // red
        },
        priorityHTML = $("<a>")
            .addClass("priorityButton")
            .html(priorityEmojis[task.priority]),
        buttonsHTML = [
            getTaskButtonHTML(taskID, "doneButton", "&#9989;", ""),
            getTaskButtonHTML(taskID, "deferButton", "&#9200;", ""),
            getTaskButtonHTML(
                taskID,
                "taskLink grey",
                "&#128279;",
                "https://todoist.com/app#task%2F" + taskID
            )
            // ADAPT THIS
            //     ? getTaskButtonHTML(
            //           taskID,
            //           "listButton grey",
            //           "&#128221;",
            //           "https://todoist.com/app?lang=en#project%2F" +
            //               task.special.list_id +
            //               "%2Ffull"
            //       )
            //     : ""
        ],
        buttonsContainer = $("<div></div>").append(priorityHTML, buttonsHTML),
        notesHTML = getTaskNotesHTML(task);

    if (project.order !== 1) {
        taskHTML.append(
            $("<div></div>")
                .addClass("projectName")
                .html(
                    "<strong id='backToProjects'>&#11013;</strong> " +
                        project.name
                )
        );
    }

    taskHTML.append(
        $("<div></div>")
            .addClass("mainTask")
            .html(taskName)
            .append(buttonsContainer, notesHTML)
    );

    return taskHTML;
}

function getTaskNotesHTML(task) {
    if (task.notes.length == 0) {
        return false;
    }

    let notesHTML = $("<div></div>").addClass("taskNotes");

    $.each(task.notes, function(i, note) {
        let converter = new showdown.Converter(),
            noteContent = converter.makeHtml(note.content),
            noteElement = $("<div></div>")
                .addClass("taskNote")
                .html(noteContent);
        notesHTML.append(noteElement);

        if (i < _.size(task.notes) - 1) {
            notesHTML.append("<hr />");
        }
    });

    return notesHTML;
}

function getSubTask(dueTasks, highestPrioritySelfCare) {
    dueTasks.sort(function(a, b) {
        var c = a.priority;
        var d = b.priority;
        return d - c;
    });

    if (highestPrioritySelfCare.special.type == "M") {
        let subTask = _.findWhere(dueTasks, {
            project_id: highestPrioritySelfCare.special.list_id
        });
        if (subTask != undefined) {
            return subTask;
        }
    }
}
