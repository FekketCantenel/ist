export { getHighestPriorityTask, getTaskHTML, getTaskCommentsHTML };

function getHighestPriorityTask(dueTasks, projects) {
    let task = {},
        projectRoutine = projects.find(({ order }) => order === 1),
        projectChosenID = Number(sessionStorage.getItem("project.id")) || 0;

    $.each([projectRoutine.id, projectChosenID], function(i, projectID) {
        task = getHighestPriorityTaskByProject(dueTasks, projectID);
        if (task !== undefined) {
            return false;
        }
    });

    return task;
}

function getHighestPriorityTaskByProject(dueTasks, projectID) {
    $.each([4, 3, 2, 1], function(i, priority) {
        task = _.findWhere(dueTasks, {
            priority,
            project_id: projectID
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

function getTaskHTML(task, projects, comments) {
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
        ],
        buttonsContainer = $("<div></div>").append(priorityHTML, buttonsHTML),
        commentsHTML = getTaskCommentsHTML(comments);

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
            .append(buttonsContainer, commentsHTML)
    );

    return taskHTML;
}

function getTaskCommentsHTML(comments) {
    if (comments.length == 0) {
        return false;
    }

    let commentsHTML = $("<div></div>").addClass("taskComments");

    $.each(comments, function(i, comment) {
        let converter = new showdown.Converter(),
            commentContent = converter.makeHtml(comment.content),
            commentElement = $("<div></div>")
                .addClass("taskComment")
                .html(commentContent);
        commentsHTML.append(commentElement);

        if (i < _.size(comments) - 1) {
            commentsHTML.append("<hr />");
        }
    });

    return commentsHTML;
}
