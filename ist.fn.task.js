export { getHighestPriorityTask, getTaskHTML, getTaskCommentsHTML };

function getHighestPriorityTask(dueTasks, projects) {
    let task = {},
        projectRoutine = projects.find(({ order }) => order === 1),
        projectChosenID = Number(sessionStorage.getItem("project.id")) || 0;

    $.each([projectRoutine.id, projectChosenID], function(i, projectID) {
        task = getHighestPriorityTaskByProject(dueTasks, projectID);

        if (_.size(task) > 0) {
            return false;
        }
    });

    return task;
}

function getHighestPriorityTaskByProject(dueTasks, projectID) {
    let task = {};

    $.each([4, 3, 2, 1], function(i, priority) {
        task = _.findWhere(dueTasks, {
            priority,
            project_id: projectID
        });

        if (_.size(task) > 0) {
            return false;
        }
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
        let commentContent = comment.content,
            converter = new showdown.Converter(),
            commentContentHTML = converter.makeHtml(commentContent),
            commentElement = $("<div></div>")
                .addClass("taskComment")
                .html(commentContentHTML);

        let regex = new RegExp("^https:\\/\\/dynalist.io\\/d\\/"),
            results = regex.exec(commentContent);

        if (results != null) {
            let dynalistContent = getDynalistContent(commentContent);
            commentsHTML.append(dynalistContent);
        } else {
            commentsHTML.append(commentElement);
        }

        if (i < _.size(comments) - 1) {
            commentsHTML.append("<hr />");
        }
    });

    return commentsHTML;
}

function getDynalistContent(commentContent) {
    if (Cookies.get("dynalistToken") === undefined) {
        return (
            "<small>" +
            "<em>To authorize Ist to display your Dynalist documents, enter your <a href='https://dynalist.io/developer' target='_blank'>secret token</a>:</em> " +
            '<form action=\'javascript:window.location.replace("?state=dynalist&code=" + $("input[name=dynalistSecret]").val().replace(/[^a-z0-9áéíóúñü .,_-]/gim, ""));\'>' +
            "<input type='text' name='dynalistSecret'>" +
            "<input name='submit' type='submit' value='↵'/>" +
            "</form>" +
            "</small>"
        );
    } else {
        let dynalistFileID = commentContent.slice(
            commentContent.lastIndexOf("/") + 1
        );

        getDynalistAPI(dynalistFileID, function(output) {
            let dynalistNodesOpen = _.filter(output.nodes, function(node) {
                    if (node.checked !== true) {
                        return true;
                    }
                }),
                dynalistNodesOrdered = treeDynalist(dynalistNodesOpen, "root"),
                dynalistNodesHTML = treeHTML(dynalistNodesOrdered);

            $(".taskComments").append(dynalistNodesHTML);
        });
    }
}

function getDynalistAPI(file_id, callback) {
    $.ajax({
        type: "POST",
        url: "https://dynalist.io/api/v1/doc/read",
        data: JSON.stringify({
            token: Cookies.get("dynalistToken"),
            file_id
        }),
        success: function(data) {
            callback(data);
        }
    });
}

function treeDynalist(nodesOpen) {
    let nodesRoot = _.find(nodesOpen, function(value) {
            return value.id == "root";
        }).children,
        nodesTree = treeGetChildren(nodesRoot, nodesOpen);

    return nodesTree;
}

function treeGetChildren(ids, nodesOpen) {
    let nodesNew = [];
    $.each(ids, function(i, id) {
        let nodeNew = _.find(nodesOpen, function(value) {
            return value.id == id;
        });

        if (nodeNew) {
            if (nodeNew.children) {
                nodeNew.childrenNodes = treeGetChildren(
                    nodeNew.children,
                    nodesOpen
                );
            }

            nodesNew.push(nodeNew);
        }
    });
    return nodesNew;
}

function treeHTML(tree) {
    let treeHTML = $("<div></div>").addClass("taskComment");

    treeHTML.append(treeHTMLGetChildren(tree));
    return treeHTML;
}

function treeHTMLGetChildren(children) {
    let treeHTMLInner = $("<ul></ul>");

    $.each(children, function(i, node) {
        let converter = new showdown.Converter(),
            nodeContentHTML = converter
                .makeHtml(node.content)
                .replace(/(<p[^>]+?>|<p>|<\/p>)/gim, "");

        let nodeHTML = $("<li></li>").html(nodeContentHTML);
        if (node.childrenNodes) {
            let nodeChildrenHTML = treeHTMLGetChildren(node.childrenNodes);
            nodeHTML.append(nodeChildrenHTML);
        }

        treeHTMLInner.append(nodeHTML);
    });

    return treeHTMLInner;
}
