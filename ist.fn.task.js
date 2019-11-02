export {
    getHighestPrioritySelfCare,
    getSubTask,
    getTaskHTML,
    getTaskNotesHTML
};

function getHighestPrioritySelfCare(dueTasks) {
    let highestPrioritySelfCare = {};
    $.each([4, 3, 2, 1], function(i, priority) {
        highestPrioritySelfCare = _.findWhere(dueTasks, {
            priority,
            project_id: 2201916342 // always self-care
        });

        return highestPrioritySelfCare == undefined;
    });
    return highestPrioritySelfCare;
}

function getTaskButtonHTML(taskID, taskClasses, emoji, href) {
    return $("<a>")
        .addClass(`roundbutton ${taskClasses}`)
        .html(emoji)
        .attr("href", href)
        .attr("taskID", taskID);
}

function getTaskHTML(task) {
    let taskID = task.id,
        converter = new showdown.Converter(),
        taskName = converter.makeHtml(task.content),
        taskHTML = $("<div></div>")
            .addClass("mainTask")
            .html(taskName),
        isMasterTask = task.special != undefined && task.special.type == "M",
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
            ),
            isMasterTask
                ? getTaskButtonHTML(
                      taskID,
                      "listButton grey",
                      "&#128221;",
                      "https://todoist.com/app?lang=en#project%2F" +
                          task.special.list_id +
                          "%2Ffull"
                  )
                : ""
        ],
        buttonsContainer = $("<div></div>").append(priorityHTML, buttonsHTML),
        notesHTML = getTaskNotesHTML(task);

    taskHTML.children("p").append(buttonsContainer, notesHTML);

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
