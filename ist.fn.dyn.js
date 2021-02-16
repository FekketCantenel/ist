/* global Cookies, $, _, localStorage, showdown */
import { spinOut, vibrate } from './ist.fn.event.js';
export { getDynalistContent, dynalistSetAuthEvents };

showdown.setOption('tables', 'true');

function getDynalistContent(commentContent, taskID) {
    if (Cookies.get('dynalistToken') === undefined) {
        const dynalistAuthHTML = $('<small></small>').append(
            $('<em></em>')
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
        const [dynalistFileID, dynalistSubItem] = commentContent
                .slice(commentContent.lastIndexOf('/') + 1)
                .split('#z='),
            readCommands = { file_id: dynalistFileID };

        postDynalistAPI('read', readCommands, function (output) {
            const dynalistMenuButtonsArray = [
                    {
                        name: 'read',
                        symbol: '&#128220;',
                        tooltip:
                            'View this Dynalist document as a comment. Useful for Todoist comments that require a more robust editing interface.'
                    },
                    {
                        name: 'checklist',
                        symbol: '&#127937;',
                        tooltip:
                            'View this Dynalist document as a checklist; when each top-level item is checked, the next is shown. Useful for tasks with many steps.'
                    },
                    {
                        name: 'rotating',
                        symbol: '&#9196;',
                        tooltip:
                            'WARNING! THIS EDITS THIS DOCUMENT. View the first top-level item in this Dynalist document; when marked done, it will be sent to the bottom of the document. Useful for lists of chores that only need to be done once in a while.'
                    },
                    {
                        name: 'project',
                        symbol: '&#128206;',
                        tooltip:
                            'WARNING! THIS EDITS THIS DOCUMENT. View the first deepest item in this Dynalist document; when marked done, it will be marked done in Dynalist. Useful for projects with a set list of steps.'
                    }
                ],
                dynalistMenu = $("<div id='dynalistmenu'></div>");

            $.each(dynalistMenuButtonsArray, (i, button) => {
                const buttonHTML = $(
                    `<button class='dynalistMenuButton' dynalistview='${button.name}' title='${button.tooltip}'>${button.symbol}<span>${button.name}</span></button>`
                );
                dynalistMenu.append(buttonHTML);
            });

            const dynalistLinkSymbol = $(
                ' <span class="dynalistLink" dynalistview="view"><svg height="28" viewBox="0 -4 23 23" width="28" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" stroke="silver" stroke-linecap="round" stroke-linejoin="round" transform="translate(4 4)"><path d="m5.5 7.5c.96940983 1.36718798 3.01111566 1.12727011 4.01111565 0l1.98888435-2c1.1243486-1.22807966 1.1641276-2.81388365 0-4-1.135619-1.15706921-2.86438099-1.15706947-4 0l-2 2"/><path d="m.64175661 12.3971156c.96940983 1.367188 3 1.1970433 4 .0697732l2-1.9748738c1.12434863-1.22807961 1.16412758-2.83900987 0-4.02512622-1.13561902-1.15706922-2.86438099-1.15706948-4 0l-2 2" transform="matrix(-1 0 0 -1 8.14 18.966)"/></g></svg></span>'
            );
            dynalistMenu.append(dynalistLinkSymbol);

            $('#spinnerDynalist').remove();
            $('.taskComments').append(dynalistMenu);

            const dynalistNodesOpen = _.filter(output.nodes, function (node) {
                    if (node.checked !== true) {
                        return true;
                    }
                }),
                parentID = dynalistSubItem || 'root',
                dynalistNodesOrdered = treeDynalist(
                    dynalistNodesOpen,
                    parentID
                ),
                dynalistHTML = getDynalistHTML(
                    dynalistNodesOrdered,
                    taskID,
                    dynalistFileID,
                    parentID
                ),
                parentNoteRaw = dynalistNodesOpen.find(
                    (task) => task.id === parentID
                ).note;

            if (parentNoteRaw) {
                const converter = new showdown.Converter({
                        openLinksInNewWindow: 'true'
                    }),
                    parentNote = converter.makeHtml(parentNoteRaw),
                    parentNoteBox = $(
                        `<div id='parentnote'>${parentNote}</div>`
                    );

                $('.taskComments').append(parentNoteBox);
            }
            $('.taskComments').append(dynalistHTML);
            $('li:has(table)').css('list-style-type', 'none');

            dynalistSetEvents(commentContent, taskID);
        });
    }
}

function postDynalistAPI(endpoint, commands, callback) {
    $.ajax({
        type: 'POST',
        url: `https://dynalist.io/api/v1/doc/${endpoint}`,
        data: JSON.stringify({
            token: Cookies.get('dynalistToken'),
            ...commands
        }),
        success: function (data) {
            callback(data);
        }
    });
}

function treeDynalist(nodesOpen, parentID) {
    const nodesRoot = _.find(nodesOpen, function (value) {
            return value.id === parentID;
        }).children,
        nodesTree = treeGetChildren(nodesRoot, nodesOpen, parentID);

    return nodesTree;
}

function treeGetChildren(ids, nodesOpen) {
    const nodesNew = [];
    $.each(ids, (i, id) => {
        const nodeNew = _.find(nodesOpen, function (value) {
            return value.id === id;
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

function getDynalistHTML(tree, taskID, dynalistFileID, parentID) {
    const treeHTML = $('<div></div>').addClass('taskComment'),
        dynalistView = localStorage.getItem(`dynalistview.${taskID}`);

    $(`button[dynalistview='${dynalistView || 'read'}']`).addClass('important');

    switch (dynalistView) {
        default:
        case 'read':
            treeHTML.append(treeHTMLGetChildren(tree, 'root', dynalistFileID));
            break;
        case 'checklist':
        case 'rotating':
            treeHTML.append(
                treeHTMLGetChecklist(
                    tree,
                    dynalistView,
                    dynalistFileID,
                    parentID
                )
            );
            break;
        case 'project':
            treeHTML.append(treeHTMLGetProject(tree, dynalistFileID, parentID));
            break;
    }

    return treeHTML;
}

function treeHTMLGetChildren(children, parentID, dynalistFileID) {
    const treeHTMLInner = $('<ul></ul>');

    $.each(children, (i, node) => {
        const converter = new showdown.Converter({
                openLinksInNewWindow: 'true'
            }),
            nodeContentHTML = converter
                .makeHtml(node.content)
                .replace(/(<p[^>]+?>|<p>|<\/p>)/gim, ''),
            nodeHTML = $('<li></li>')
                .attr('dynalistid', node.id)
                .attr('dynalistparentid', parentID)
                .attr('dynalistfileid', dynalistFileID)
                .html(nodeContentHTML);

        if (node.childrenNodes) {
            const nodeChildrenHTML = treeHTMLGetChildren(
                node.childrenNodes,
                node.id,
                dynalistFileID
            );
            nodeHTML.append(nodeChildrenHTML);
        }

        treeHTMLInner.append(nodeHTML);
    });

    return treeHTMLInner;
}

function treeHTMLGetChecklist(tree, view, dynalistFileID, parentID) {
    const treeHTMLChildren = treeHTMLGetChildren(
            tree,
            parentID,
            dynalistFileID
        ),
        treeHTMLChildrenCount = treeHTMLChildren.children().length;

    treeHTMLChildren.addClass('nobullets');
    treeHTMLChildren.children().prepend(function (index) {
        return `<button class='done${view}'>done<br /><small>${index + 1}/${treeHTMLChildrenCount}</small></button>`;
    });

    treeHTMLChildren.children().not(':first').hide();
    return treeHTMLChildren;
}

function treeHTMLGetProject(tree, dynalistFileID, parentID) {
    const treeHTMLChildren = treeHTMLGetChildren(
        tree,
        parentID,
        dynalistFileID
    );
    let taskFound = 0;

    $.each($(treeHTMLChildren[0]).find('li'), (i, node) => {
        node = $(node);

        if (taskFound === 1) {
            node.remove();
            return true;
        }

        const firstChild = node.find('li');

        if (firstChild.length === 0) {
            node.addClass('projectTask nobullets').prepend(
                $("<button class='doneproject'>done</button>")
            );
            taskFound = 1;
        } else {
            node.addClass('projectParent nobullets').prepend('... ');
        }
    });

    return treeHTMLChildren;
}

function dynalistSetEvents(link, taskID) {
    $('.taskComment * button').click(() => {
        vibrate();
    });

    $('.dynalistMenuButton, .dynalistLink').on('click auxclick', function () {
        if ($(this).attr('dynalistview') === 'view') {
            window.open(link, '_blank');
        } else {
            localStorage.setItem(
                `dynalistview.${taskID}`,
                $(this).attr('dynalistview')
            );
            spinOut();
        }
    });

    $('.donechecklist').click(function () {
        const dynalistNext = $(this).parent().next('li');

        if (dynalistNext.length > 0) {
            dynalistNext.show();
        } else {
            $('.taskComments').append(
                'Checklist finished! Mark this task done or reload to start over.'
            );
        }

        $(this).parent().hide();
    });

    $('.donerotating').click(function () {
        const writeCommands = {
            file_id: $(this).parent().attr('dynalistfileid'),
            changes: [
                {
                    action: 'move',
                    node_id: $(this).parent().attr('dynalistid'),
                    parent_id: $(this).parent().attr('dynalistparentid'),
                    index: -1
                }
            ]
        };

        postDynalistAPI('edit', writeCommands, function (output) {
            spinOut();
        });
    });

    $('.doneproject').click(function () {
        const writeCommands = {
            file_id: $(this).parent().attr('dynalistfileid'),
            changes: [
                {
                    action: 'edit',
                    node_id: $(this).parent().attr('dynalistid'),
                    checked: true
                }
            ]
        };

        postDynalistAPI('edit', writeCommands, function (output) {
            spinOut();
        });
    });
}

function dynalistSetAuthEvents() {
    $('#dynalistAuthSubmit').submit(function (event) {
        event.preventDefault();

        const authURL = `?state=dynalist&code=${$('input[name=dynalistSecret]')
            .val()
            .replace(/[^a-z0-9áéíóúñü .,_-]/gim)}`;

        window.location.replace(authURL);
    });
}
