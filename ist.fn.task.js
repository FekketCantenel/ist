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
                } remaining in project`
            ),
        taskName = converter.makeHtml(task.content),
        taskHTML = $('<div></div>'),
        taskPrioritySymbol = $(`<span>&#x${2775 + task.priority}</span>`)
            .css('color', `${PRIORITIES[task.priority]}`)
            .addClass('priorityButton'),
        buttonsHTML = [
            getTaskButtonHTML(taskID, 'doneButton', '&#9989;', ''),
            getTaskButtonHTML(taskID, 'deferButton', '&#9200;', ''),
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
                .html($('<span id="backToProjects">&#11013; </span>'))
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
