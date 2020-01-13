import { spinOut } from "./ist.fn.event.js";
export { getDynalistContent, dynalistSetAuthEvents };

function getDynalistContent(commentContent, taskID) {
    if (Cookies.get("dynalistToken") === undefined) {
        let dynalistAuthHTML = $("<small></small>").append(
            $("<em></em>")
                .html(
                    "To authorize Ist to display your Dynalist documents, enter your <a href='https://dynalist.io/developer' target='_blank'>secret token</a>:"
                )
                .append(
                    $("<form id='dynalistAuthSubmit'></form>")
                        .append(
                            $("<input type='text' name='dynalistSecret' />")
                        )
                        .append(
                            $("<button name='submit' type='submit'>↵</button>")
                        )
                )
        );

        return dynalistAuthHTML;
    } else {
        let dynalistFileID = commentContent.slice(
            commentContent.lastIndexOf("/") + 1
        );

        let readCommands = { file_id: dynalistFileID };

        postDynalistAPI("read", readCommands, function(output) {
            let dynalistMenuButtonsArray = [
                    {
                        name: "read",
                        symbol: "&#128220;",
                        tooltip:
                            "View this Dynalist document as a comment. Useful for Todoist comments that require a more robust editing interface."
                    },
                    {
                        name: "checklist",
                        symbol: "&#127937;",
                        tooltip:
                            "View this Dynalist document as a checklist; when each top-level item is checked, the next is shown. Useful for tasks with many steps."
                    },
                    {
                        name: "rotating",
                        symbol: "&#9196;",
                        tooltip:
                            "WARNING! THIS EDITS THIS DOCUMENT. View the first top-level item in this Dynalist document; when marked done, it will be sent to the bottom of the document. Useful for lists of chores that only need to be done once in a while."
                    },
                    {
                        name: "project",
                        symbol: "&#128206;",
                        tooltip:
                            "WARNING! THIS EDITS THIS DOCUMENT. View the first deepest item in this Dynalist document; when marked done, it will be marked done in Dynalist. Useful for projects with a set list of steps."
                    },
                    {
                        name: "view",
                        symbol: "&#128279;",
                        tooltip: "Open this document in Dynalist."
                    }
                ],
                dynalistMenu = $("<div id='dynalistmenu'></div>");

            $.each(dynalistMenuButtonsArray, function(i, button) {
                let buttonHTML = $(
                    "<button class='dynalistMenuButton' dynalistview='" +
                        button.name +
                        "' title='" +
                        button.tooltip +
                        "'>" +
                        button.symbol +
                        " <span>" +
                        button.name +
                        "</span></button>"
                );
                dynalistMenu.append(buttonHTML);
            });

            $(".taskComments").append(dynalistMenu);

            let dynalistNodesOpen = _.filter(output.nodes, function(node) {
                    if (node.checked !== true) {
                        return true;
                    }
                }),
                dynalistNodesOrdered = treeDynalist(dynalistNodesOpen, "root"),
                dynalistHTML = getDynalistHTML(
                    dynalistNodesOrdered,
                    taskID,
                    dynalistFileID
                );

            $(".taskComments").append(dynalistHTML);

            dynalistSetEvents(commentContent, taskID);
        });
    }
}

function postDynalistAPI(endpoint, commands, callback) {
    $.ajax({
        type: "POST",
        url: "https://dynalist.io/api/v1/doc/" + endpoint,
        data: JSON.stringify({
            token: Cookies.get("dynalistToken"),
            ...commands
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

function getDynalistHTML(tree, taskID, dynalistFileID) {
    let treeHTML = $("<div></div>").addClass("taskComment");

    let dynalistView = localStorage.getItem("dynalistview." + taskID);

    $("button[dynalistview=" + (dynalistView || "read") + "]").addClass(
        "important"
    );

    switch (dynalistView) {
        default:
        case "read":
            treeHTML.append(treeHTMLGetChildren(tree, dynalistFileID));
            break;
        case "checklist":
        case "rotating":
            treeHTML.append(
                treeHTMLGetChecklist(tree, dynalistView, dynalistFileID)
            );
            break;
        case "project":
            treeHTML.append(treeHTMLGetProject(tree, dynalistFileID));
            break;
    }

    return treeHTML;
}

function treeHTMLGetChildren(children, dynalistFileID) {
    // console.log(dynalistFileID);
    let treeHTMLInner = $("<ul></ul>");

    $.each(children, function(i, node) {
        let converter = new showdown.Converter({
                openLinksInNewWindow: "true"
            }),
            nodeContentHTML = converter
                .makeHtml(node.content)
                .replace(/(<p[^>]+?>|<p>|<\/p>)/gim, "");

        let nodeHTML = $("<li></li>")
            .attr("dynalistid", node.id)
            .attr("dynalistfileid", dynalistFileID)
            .html(nodeContentHTML);
        if (node.childrenNodes) {
            let nodeChildrenHTML = treeHTMLGetChildren(
                node.childrenNodes,
                dynalistFileID
            );
            nodeHTML.append(nodeChildrenHTML);
        }

        treeHTMLInner.append(nodeHTML);
    });

    return treeHTMLInner;
}

function treeHTMLGetChecklist(tree, view, dynalistFileID) {
    let treeHTMLChildren = treeHTMLGetChildren(tree, dynalistFileID);

    treeHTMLChildren.addClass("nobullets");
    treeHTMLChildren
        .children()
        .prepend($("<button class='done" + view + "'>done</button>"));

    treeHTMLChildren
        .children()
        .not(":first")
        .hide();
    return treeHTMLChildren;
}

function treeHTMLGetProject(tree, dynalistFileID) {
    let treeHTMLChildren = treeHTMLGetChildren(tree, dynalistFileID),
        taskFound = 0;

    $.each($(treeHTMLChildren[0]).find("li"), function(i, node) {
        node = $(node);

        if (taskFound === 1) {
            node.remove();
            return true;
        }

        let firstChild = node.find("li");
        if (firstChild.length === 0) {
            node.addClass("projectTask nobullets").prepend(
                $("<button class='doneproject'>done</button>")
            );
            taskFound = 1;
        } else {
            node.addClass("projectParent nobullets").prepend("> ");
        }
    });

    return treeHTMLChildren;
}

function dynalistSetEvents(link, taskID) {
    $(".dynalistMenuButton").click(function() {
        if ($(this).attr("dynalistview") === "view") {
            window.open(link, "_blank");
        } else {
            localStorage.setItem(
                "dynalistview." + taskID,
                $(this).attr("dynalistview")
            );
            spinOut();
        }
    });

    $(".donechecklist").click(function() {
        let dynalistNext = $(this)
            .parent()
            .next("li");

        if (dynalistNext.length > 0) {
            dynalistNext.show();
        } else {
            $(".taskComments").append(
                "Checklist finished! Mark this task done or reload to start over."
            );
        }

        $(this)
            .parent()
            .hide();
    });

    $(".donerotating").click(function() {
        let writeCommands = {
            file_id: $(this)
                .parent()
                .attr("dynalistfileid"),
            changes: [
                {
                    action: "move",
                    node_id: $(this)
                        .parent()
                        .attr("dynalistid"),
                    parent_id: "root",
                    index: -1
                }
            ]
        };

        postDynalistAPI("edit", writeCommands, function(output) {
            spinOut();
        });
    });

    $(".doneproject").click(function() {
        let writeCommands = {
            file_id: $(this)
                .parent()
                .attr("dynalistfileid"),
            changes: [
                {
                    action: "edit",
                    node_id: $(this)
                        .parent()
                        .attr("dynalistid"),
                    checked: true
                }
            ]
        };

        postDynalistAPI("edit", writeCommands, function(output) {
            spinOut();
        });
    });
}

function dynalistSetAuthEvents() {
    $("#dynalistAuthSubmit").submit(function(event) {
        event.preventDefault();

        let authURL =
            "?state=dynalist&code=" +
            $("input[name=dynalistSecret]")
                .val()
                .replace(/[^a-z0-9áéíóúñü .,_-]/gim);

        window.location.replace(authURL);
    });
}
