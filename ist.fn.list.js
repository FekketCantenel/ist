/* global $, moment, _ */
/* eslint camelcase:0 */

import COLORS from './colors.js';
import { postNewTaskTime } from './ist.fn.api.js';
import { getTaskRepeatMoment } from './ist.fn.task.js';
export { getAllTasks, getDueTasks, getSuggestTasksHTML };

function getAllTasks(todoistRawTasks) {
    let overdue = 0;
    $.each(todoistRawTasks, (i, task) => {
        if (task.due == null) {
            return true;
        }

        task.due.all_day = task.due.datetime ? 0 : 1;
        task.due.moment = moment(task.due.datetime || task.due.date).local();

        if (task.due.moment.isBefore(moment(), 'day')) {
            overdue = 1;
        }
    });

    if (overdue === 1) {
        deferOverdueTasks(todoistRawTasks);
        return 'overdue';
    } else {
        return todoistRawTasks;
    }
}

function deferOverdueTasks(tasks) {
    const tasksToDefer = [];

    $.each(tasks, (i, task) => {
        if (task.due == null) {
            return true;
        }

        if (task.due.moment.isBefore(moment(), 'day')) {
            let taskNewMoment = moment(),
                taskNewDateString = '';

            if (task.due.all_day === 1) {
                taskNewDateString = taskNewMoment.format('YYYY-MM-DD');
            } else {
                taskNewMoment = getTaskRepeatMoment(task);
                taskNewDateString = taskNewMoment.format('YYYY-MM-DDTHH:mm:ss');
            }

            tasksToDefer.push({
                id: task.id,
                string: task.due.string,
                date: taskNewDateString
            });
        }
        if (tasksToDefer.count === 99) {
            return false;
        }
    });
    postNewTaskTime(tasksToDefer);
}

function getDueTasks(allTasks) {
    const dueTasks = _.filter(allTasks, (task) => {
        if (task.due == null) {
            return false;
        }
        return task.due.moment.isBefore(moment(), 'second');
    });

    dueTasks.sort((a, b) => {
        const c = new Date(a.due.datetime || a.due.date),
            d = new Date(b.due.datetime || b.due.date);
        return c - d;
    });

    return dueTasks;
}

function getSuggestTasksHTML(dueTasks, projects, activity) {
    const suggestTasks = $('<div></div>').addClass('suggestTasks'),
        countedTasks = _.countBy(dueTasks, 'project_id'),
        activityDisplay = $('<div id="activityDisplay"></div>');
    let flexWidth = 0.1;

    $.each(projects, (i, project) => {
        const projectActivity = activity.find(({ id }) => id === project.id);

        if (projectActivity) {
            const activityColumn = $('<div></div>'),
                activityColumnText = $(
                    `<p>${project.name} (${projectActivity.completed})</p>`
                );
            activityColumn.append(activityColumnText);
            activityColumn.css('background-color', COLORS[project.color]);
            activityColumn.css('flex-grow', projectActivity.completed);
            activityColumn.attr(
                'title',
                `${project.name} (${projectActivity.completed})`
            );
            activityDisplay.append(activityColumn);

            flexWidth += projectActivity.completed;
        }

        if (project.name.slice(project.name.length - 1) === '_') {
            return true;
        }

        project.count = countedTasks[project.id] || 0;

        if (project.count > 0) {
            project.countByPriority = _.countBy(
                _.where(dueTasks, {
                    project_id: project.id
                }),
                'priority'
            );

            const badgeHTML = $(`<a>${project.count}</a>`)
                    .addClass('badge')
                    .data('badge', project.count),
                dots = project.countByPriority.join(' '),
                suggestTaskDots = $('<div></div>')
                    .addClass('suggestDots')
                    .html(dots),
                suggestTaskButton = $('<button></button>')
                    .addClass('suggest')
                    .attr('projectid', project.id)
                    .html(project.name)
                    .append(suggestTaskDots),
                projectURL =
                    `<a class='projectLink' target='_blank' href='https://todoist.com/app#agenda%2F(overdue | today) %26 %23 ${project.name}'>&#128279;</a>` +
                    `<a class='projectLinkMobile' target='_blank' href='todoist://project?id=${project.id}'>&#128279;</a>`;

            suggestTaskButton.append(badgeHTML);

            suggestTasks.append(suggestTaskButton, projectURL, $('<br />'));
        }
    });

    if (flexWidth < 21) {
        const activityColumnDummyWidth = Math.ceil(
                Math.ceil(flexWidth / 7) * 7 - flexWidth
            ),
            activityColumnString = `+${activityColumnDummyWidth} to ${
                activityColumnDummyWidth + Math.floor(flexWidth)
            }`,
            activityColumnDummy = $(`<div>${activityColumnString}</div>`).css(
                'flex-grow',
                activityColumnDummyWidth
            );
        activityColumnDummy.attr('title', activityColumnString);

        activityDisplay.append(activityColumnDummy);
    }

    suggestTasks.append(activityDisplay);

    const chosenProjectID = getHighestPriorityProjectID(dueTasks, projects);

    suggestTasks
        .children(`button[projectid="${chosenProjectID}"]`)
        .first()
        .addClass('chosen');

    return suggestTasks;
}

function getHighestPriorityProjectID(dueTasks, projects) {
    let priorityProjectID = 0;

    $.each([4, 3, 2, 1, 0], (i, currentPriority) => {
        const priorityTasks = dueTasks.filter(
            ({ priority }) => currentPriority === priority
        );

        if (Array.isArray(priorityTasks) && priorityTasks.length) {
            $.each(projects, (i, project) => {
                if (project.name.slice(project.name.length - 1) === '_') {
                    return false;
                }
                const projectPriorityTasks = priorityTasks.filter(
                    ({ project_id }) => project_id === project.id
                );

                if (
                    Array.isArray(projectPriorityTasks) &&
                    projectPriorityTasks.length
                ) {
                    priorityProjectID = project.id;
                    return false;
                }
                if (priorityProjectID > 0) {
                    return false;
                }
            });
        } else {
            return true;
        }

        if (priorityProjectID > 0) {
            return false;
        }
    });

    return priorityProjectID;
}
