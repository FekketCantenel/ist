/* global Cookies, $, _, localStorage, showdown */
import { spinOut } from './ist.fn.event.js';
export { getDynalistContent, dynalistSetAuthEvents };

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
                dynalistMenu = $("<div class='dynalistmenu'></div>");

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

            const dynalistNodesOpen = _.filter(output.nodes, function (node) {
                if (node.checked !== true) {
                    return true;
                }
            }),
                parentID = dynalistSubItem || 'root',
                parentNode = dynalistNodesOpen.find(
                    (task) => task.id === parentID
                ),
                { childNodes: dynalistNodesOrdered, parentNode: dynalistNodeParent } = treeDynalist(dynalistNodesOpen, parentID),
                dynalistHTML = getDynalistHTML(
                    dynalistNodesOrdered,
                    taskID,
                    dynalistFileID,
                    parentNode,
                    dynalistNodeParent
                );

            const dynalistView = $(dynalistHTML).attr('dynalistView');
            if (!dynalistView.startsWith('count')) {
                $(dynalistMenu).find(`button[dynalistview='${dynalistView}']`).addClass('important');
                dynalistHTML.prepend(dynalistMenu)
            }

            $('.taskComments').append(dynalistHTML);

            if (
                parentNode.note &&
                !['checklist', 'rotating', 'project', 'count'].includes(parentNode.note.split(' ')[0])
            ) {
                const converter = new showdown.Converter(),
                    parentNote = converter.makeHtml(parentNode.note),
                    parentNoteBox = $(
                        `<div id='parentnote'>${parentNote}</div>`
                    );

                $(`.taskComment#${parentNode.id}`).append(parentNoteBox);
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
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('API call failed:', textStatus, errorThrown);
            Cookies.remove('dynalistToken');
        }
    });
}

function treeDynalist(nodesOpen, parentID) {
    const parentNode = _.find(nodesOpen, function (value) {
        return value.id === parentID;
    });

    const childNodes = parentNode.children;
    const nodesTree = treeGetChildren(childNodes, nodesOpen, parentID);
    delete parentNode.children;

    return { childNodes: nodesTree, parentNode: parentNode };
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

function getDynalistHTML(tree, taskID, dynalistFileID, parentNode, dynalistNodeParent) {
    const treeHTML = $('<div class="taskComment"></div>');
    let dynalistView = localStorage.getItem(`dynalistview.${taskID}`);

    if (['count'].includes(parentNode.note.split(' ')[0])) {
        dynalistView = parentNode.note
    } else if (!dynalistView) {
        if (
            parentNode.note &&
            ['checklist', 'rotating', 'project'].includes(parentNode.note.split(' ')[0])
        ) {
            dynalistView = parentNode.note;
        } else {
            dynalistView = 'read'
        }
    }
    $(`.taskComment#${parentNode.id} .dynalistmenu button[dynalistview='${dynalistView || 'read'}']`).addClass('important');

    let count;
    if (dynalistView.indexOf('count') === 0) {
        const parts = dynalistView.split(' ');
        count = {
            total: parseInt(parts[1].split('/')[0]),
            current: parts[1].split('/')[1] ? parseInt(parts[1].split('/')[1]) : 0,
            date: parts[2] ? parts[2] : new Date().toLocaleDateString('en-US', {
                month: '2-digit', day: '2-digit', year: 'numeric'
            })
        }

        if ((!count.date) || (count.date && count.date < (new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })))) {
            count.current = 0
        }
    }

    let treeHTMLRender;

    switch (parentNode.note.split(' ')[0]) {
        default:
        case 'read':
            treeHTMLRender = treeHTMLGetChildren(tree, 'root', dynalistFileID);
            treeHTMLRender
                .addClass('bulletleft')
                .find('ul')
                .addClass('bulletleft');
            treeHTML.append(treeHTMLRender);
            break;
        case 'checklist':
        case 'rotating':
            treeHTML.append(
                treeHTMLGetChecklist(
                    tree,
                    dynalistView,
                    dynalistFileID,
                    parentNode.id
                )
            );
            break;
        case 'project':
            treeHTML.append(
                treeHTMLGetProject(tree, dynalistFileID, parentNode.id)
            );
            break;
        case 'count':
            treeHTML.append(
                treeHTMLGetCount(dynalistNodeParent, count)
            );
            break;
    }

    treeHTML.attr('dynalistView', dynalistView).attr('id', parentNode.id).attr('dynalistFileID', dynalistFileID).attr('viewType', parentNode.note.split(' ')[0])

    return treeHTML;
}

function treeHTMLGetChildren(children, parentID, dynalistFileID) {
    const treeHTMLInner = $('<ul></ul>');

    $.each(children, (i, node) => {
        const converter = new showdown.Converter(),
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

function treeHTMLGetCount(dynalistNodeParent, count) {
    const dynalistNodeParentHTML = $(`<ul>${dynalistNodeParent.content}</ul>`);
    dynalistNodeParentHTML.addClass('nobullets');

    if (count.current >= count.total) {
        $(this).parent().addClass('completed').siblings('.currentCount').addClass('completed')
    }

    const countsContainer = $('<span class="counts"></span>'),
        currentCountClass = count.current >= count.total ? ' completed' : '',
        countsElements = $(`<span class="currentCount${currentCountClass}">${count.current}</span>/<span class="goalCount">${count.total}</span><br />`),
        countsAmounts = [1, 5, 10];

    let countsButtons = $(`<span class="countButtons${currentCountClass}"></span>`);
    $.each(countsAmounts, (i, number) => {
        countsButtons.append(`<button class="count-add-${number}">+${number}</button>`);
    });

    countsContainer.append(countsElements, countsButtons);

    dynalistNodeParentHTML.append(countsContainer);

    return dynalistNodeParentHTML;
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

    treeHTMLChildren.addClass('bulletleft');
    return treeHTMLChildren;
}

function dynalistSetEvents(link, taskID) {
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

    $('.donechecklist').on('click auxclick', function () {
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

    $('.donerotating').on('click auxclick', function () {
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

    $('.doneproject').on('click auxclick', function () {
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

    $('.count-add-1, .count-add-5, .count-add-10').on('click auxclick', function () {
        const added = Number($(this).attr('class').split('-').pop()),
            currentCountElement = $(this).parent().siblings('.currentCount'),
            oldCount = Number(currentCountElement.text()),
            currentCount = oldCount + added,
            goalCount = $(this).parent().siblings('.goalCount').text(),
            today = new Date(),
            formattedDate = (today.getMonth() + 1) + '-' + today.getDate() + '-' + today.getFullYear(),
            newCountString = `count ${goalCount}/${currentCount} ${formattedDate}`,
            dynalistFileID = $(this).closest('.taskComment').attr('dynalistFileID'),
            nodeID = $(this).closest('.taskComment').attr('id');

        const writeCommands = {
            file_id: dynalistFileID,
            changes: [
                {
                    action: 'edit',
                    node_id: nodeID,
                    note: newCountString
                }
            ]
        };

        postDynalistAPI('edit', writeCommands, function (output) {
            $(currentCountElement).text(currentCount)

            if (currentCount >= goalCount) {
                $(this).parent().addClass('completed').siblings('.currentCount').addClass('completed')
            }
        });
    });
}

function dynalistSetAuthEvents() {
    $('#dynalistAuthSubmit').on('submit', function (event) {
        event.preventDefault();

        const authURL = `? state = dynalist & code=${$('input[name=dynalistSecret]')
            .val()
            .replace(/[^a-z0-9áéíóúñü .,_-]/gim)
            }`;

        window.location.replace(authURL);
    });
}
