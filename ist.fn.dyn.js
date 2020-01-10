export { getDynalistContent };

function getDynalistContent(commentContent) {
    if (Cookies.get("dynalistToken") === undefined) {
        return (
            "<small>" +
            "<em>To authorize Ist to display your Dynalist documents, enter your <a href='https://dynalist.io/developer' target='_blank'>secret token</a>:</em> " +
            '<form action=\'javascript:window.location.replace("?state=dynalist&code=" + $("input[name=dynalistSecret]").val().replace(/[^a-z0-9áéíóúñü .,_-]/gim, ""));\'>' +
            "<input type='text' name='dynalistSecret'>" +
            "<button name='submit' type='submit'>↵</button>" +
            "</form>" +
            "</small>"
        );
    } else {
        let dynalistFileID = commentContent.slice(
            commentContent.lastIndexOf("/") + 1
        );

        getDynalistAPI(dynalistFileID, function(output) {
            let dynalistMenuButtonsArray = [
                    {
                        name: "read",
                        symbol: "&#128220;",
                        tooltip:
                            "View this Dynalist document as a comment. Useful for Todoist comments that require a more robust editing interface."
                    },
                    {
                        name: "checklist",
                        symbol: "&#9745;",
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
                        symbol: "&#128240;",
                        tooltip:
                            "WARNING! THIS EDITS THIS DOCUMENT. View the first deepest item in this Dynalist document; when marked done, it will be marked done in Dynalist. Useful for projects with a set list of steps."
                    },
                    {
                        name: "view",
                        symbol: "&#128206;",
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
                        " " +
                        button.name +
                        "</button>"
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
                dynalistHTML = getDynalistHTML(dynalistNodesOrdered);

            $(".taskComments").append(dynalistHTML);

            dynalistSetEvents(commentContent);
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

function getDynalistHTML(tree) {
    let treeHTML = $("<div></div>").addClass("taskComment");

    let dynalistView = sessionStorage.getItem("dynalistview");

    if (dynalistView) {
        $("button[dynalistview=" + dynalistView + "]").addClass("important");
    }
    switch (dynalistView) {
        default:
        case "read":
            treeHTML.append(treeHTMLGetChildren(tree));
            break;
        case "checklist":
            let treeHTMLChildren = treeHTMLGetChildren(tree);

            treeHTMLChildren.addClass("nobullets");
            treeHTMLChildren
                .children()
                .prepend($("<button class='doneChecklist'>done</button>"));

            treeHTMLChildren
                .children()
                .not(":first")
                .hide();
            treeHTML.append(treeHTMLChildren);
            console.log("CHECKLIST");
            break;
        case "rotating":
            console.log("ROTATING");
            break;
        case "project":
            console.log("PROJECT");
            break;
    }

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

function dynalistSetEvents(link) {
    $(".dynalistMenuButton").click(function() {
        if ($(this).attr("dynalistview") === "view") {
            window.open(link, "_blank");
        } else {
            sessionStorage.setItem(
                "dynalistview",
                $(this).attr("dynalistview")
            );
            $("#spinner, #task").toggle();
            location.reload();
        }
    });

    $(".doneChecklist").click(function() {
        $(this)
            .parent()
            .next("li")
            .show();
        $(this)
            .parent()
            .hide();
    });
}
