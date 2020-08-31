/* global sessionStorage, $, _, showdown, moment */
/* eslint camelcase:0 */
import PRIORITIES from './priorities.js';
import { getDynalistContent } from './ist.fn.dyn.js';
export {
    getHighestPriorityTask,
    getTaskHTML,
    getTaskCommentsHTML,
    getTaskRepeatMoment
};

function getHighestPriorityTask(dueTasks, projects) {
    let task = {};
    const projectRoutine = projects.find(({ order }) => order === 1),
        projectChosenID = Number(sessionStorage.getItem('project.id')) || 0;

    $.each([projectRoutine.id, projectChosenID], (i, projectID) => {
        task = getHighestPriorityTaskByProject(dueTasks, projectID);

        if (_.size(task) > 0) {
            return false;
        }
    });

    return task;
}

function getHighestPriorityTaskByProject(dueTasks, projectID) {
    let task = {};

    $.each([4, 3, 2, 1], (i, priority) => {
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
    return $('<a>')
        .addClass(`roundbutton ${taskClasses}`)
        .html(emoji)
        .attr('href', href)
        .attr('taskID', taskID);
}

function getTaskHTML(task, projects, comments, dueTasks) {
    const taskID = task.id,
        converter = new showdown.Converter(),
        project = projects.find(({ id }) => id === Number(task.project_id)),
        dueTasksInProject = dueTasks.filter(
            ({ project_id }) => project_id === project.id
        ).length,
        dueTasksText = $('<p></p>')
            .attr('id', 'dueTasksInProject')
            .html(
                `${
                    dueTasksInProject > 1
                        ? `${dueTasksInProject} tasks`
                        : 'last task'
                } remaining in context`
            ),
        taskName = converter.makeHtml(task.content),
        taskHTML = $('<div></div>'),
        taskPrioritySymbol = $(`<span>&#x${2775 + task.priority}</span>`)
            .css('color', `${PRIORITIES[task.priority]}`)
            .addClass('priorityButton'),
        buttonsHTML = [
            getTaskButtonHTML(
                taskID,
                'doneButton',
                '<svg viewBox="4 4 14 14" width="36" height="36" xmlns="http://www.w3.org/2000/svg"><path d="m.5 5.5 3 3 8.028-8" fill="none" stroke="rgb(54, 253, 54)" stroke-linecap="round" stroke-linejoin="round" transform="translate(5 6)"/></svg>',
                ''
            ),
            getTaskButtonHTML(
                taskID,
                'deferButton',
                '<svg viewBox="-1 1 24 22" width="36" height="36" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" stroke="#2a2e3b" stroke-linecap="round" stroke-linejoin="round" transform="matrix(-1 0 0 1 20 2)"><path d="m8.5 2.56534572h2c3.3137085 0 6 2.6862915 6 6v1.93465428c0 3.3137085-2.6862915 6-6 6h-2c-3.3137085 0-6-2.6862915-6-6v-1.93465428c0-3.3137085 2.6862915-6 6-6z"/><path d="m3.94265851-.12029102c-1.05323083.28505997-1.86575682 1.17688618-1.86575682 2.30840383 0 1.16606183.73081563 2.21070886 1.78973019 2.50733508" transform="matrix(.62932039 .77714596 -.77714596 .62932039 2.893856 -1.491094)"/><path d="m16.9295345-.10708618c-1.0898445.26224883-1.9419712 1.17003523-1.9419712 2.3284815 0 1.16644061.7312905 2.21138754 1.7907622 2.50762392" transform="matrix(-.62932039 .77714596 .77714596 .62932039 24.205765 -11.545558)"/><path d="m9.5 5.5v4h-3.5"/><path d="m15 15 2 2"/><path d="m2 15 2 2" transform="matrix(-1 0 0 1 6 0)"/></g></svg>',
                ''
            ),
            getTaskButtonHTML(
                taskID,
                'taskLink grey',
                '&#128279;',
                `https://todoist.com/app#task%2F${taskID}`
            ),
            getTaskButtonHTML(
                taskID,
                'taskLinkMobile grey',
                '&#128279;',
                `todoist://task?id=${taskID}`
            )
        ],
        buttonsContainer = $('<div></div>').append(
            taskPrioritySymbol,
            buttonsHTML
        ),
        commentsHTML = getTaskCommentsHTML(comments);

    if (project.order !== 1) {
        taskHTML.append(
            $('<div></div>')
                .addClass('projectName')
                .html(
                    $(
                        '<span id="backToProjects"><svg width="60" height="48" viewBox="3 -2 18 21" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" stroke="rgb(54, 253, 54)" stroke-linecap="round" stroke-linejoin="round" transform="matrix(-1 0 0 1 20 2)"><circle cx="8.5" cy="8.5" r="8"/><path d="m11.621 6.379v4.242h-4.242" transform="matrix(.70710678 .70710678 .70710678 -.70710678 -3.227683 7.792317)"/><path d="m8.5 4.5v8" transform="matrix(0 1 -1 0 17 0)"/></g></svg></span>'
                    )
                )
                .append(`<span>${project.name}</span>`)
        );
    }

    taskHTML.append(
        $('<div></div>')
            .addClass('mainTask')
            .html(taskName)
            .append(buttonsContainer, dueTasksText, commentsHTML)
    );

    return taskHTML;
}

function getTaskCommentsHTML(comments) {
    if (comments.length === 0) {
        return false;
    }

    const commentsHTML = $('<div></div>').addClass('taskComments');

    $.each(comments, (i, comment) => {
        const commentContent = comment.content,
            converter = new showdown.Converter({
                openLinksInNewWindow: 'true'
            }),
            commentContentHTML = converter.makeHtml(commentContent),
            commentElement = $('<div></div>')
                .addClass('taskComment')
                .html(commentContentHTML),
            regex = new RegExp('^https:\\/\\/dynalist.io\\/d\\/'),
            results = regex.exec(commentContent);

        if (results != null) {
            const newSpinner = $('#spinner')
                .clone()
                .attr('id', 'spinnerDynalist')
                .show();

            newSpinner.appendTo(commentsHTML);

            const dynalistContent = getDynalistContent(
                commentContent,
                comment.task_id
            );
            commentsHTML.append(dynalistContent);
        } else {
            commentsHTML.append(commentElement);

            if (i < _.size(comments) - 1) {
                commentsHTML.append('<hr />');
            }
        }
    });

    return commentsHTML;
}

function getTaskRepeatMoment(task) {
    let taskNewTime = task.due.string.split(' ');
    taskNewTime = taskNewTime.slice(-2);
    const taskNewMoment = moment(taskNewTime, ['hh:mma', 'hha', 'ha']);

    if (!/[AM|PM]$/i.test(task.due.string)) {
        taskNewMoment.hour(5);
    }

    return taskNewMoment;
}
