/* global sessionStorage, $, Cookies, showdown */
import ENV from './env.js';
import { getAPI, getAuth, getURLParameter } from './ist.fn.api.js';
import {
    getAllTasks,
    getDueTasks,
    getSuggestTasksHTML
} from './ist.fn.list.js';
import { getHighestPriorityTask, getTaskHTML } from './ist.fn.task.js';
import { setEvents } from './ist.fn.event.js';
import { dynalistSetAuthEvents } from './ist.fn.dyn.js';

$(document).ready(function() {
    async function asyncCall() {
        const authCode = getURLParameter('code'),
            authState = getURLParameter('state');

        if (Cookies.get('todoistToken') === undefined) {
            if (authCode && authState === 'todoist') {
                $('#task').append('logging into Todoist, please wait...');
                const authRaw = await getAuth(authCode),
                    authToken = authRaw.access_token;
                Cookies.set('todoistToken', authToken, {
                    expires: 182
                });
                window.location.replace('/');
            } else {
                $.get('README.md', function(readme) {
                    const converter = new showdown.Converter(),
                        readmeHTML = converter.makeHtml(readme);

                    $('#task').append(
                        readmeHTML,
                        `<a href="https://todoist.com/oauth/authorize?client_id=${ENV.CLIENTID}&state=todoist&scope=data:read_write"><button>when ready, log in with Todoist</button></a>`
                    );
                });
                $('#spinner').hide();
                return false;
            }
        } else {
            if (authCode && authState === 'dynalist') {
                $('#task').append('logging into Dynalist, please wait...');
                Cookies.set('dynalistToken', authCode, {
                    expires: 182
                });
                window.location.replace('/');
            }

            const todoistRawTasks = await getAPI('tasks');

            const allTasks = getAllTasks(todoistRawTasks),
                dueTasks = getDueTasks(allTasks);

            if (allTasks === 'overdue') {
                throw new Error('rescheduling overdue tasks');
            }

            const projects = await getAPI('projects'),
                highestPriorityTask = getHighestPriorityTask(
                    dueTasks,
                    projects
                );

            if (highestPriorityTask) {
                const todoistRawComments = await getAPI(
                        `comments?task_id=${highestPriorityTask.id}`
                    ),
                    mainTask = getTaskHTML(
                        highestPriorityTask,
                        projects,
                        todoistRawComments,
                        dueTasks
                    );

                $('#task').append(mainTask);
                dynalistSetAuthEvents();
            } else {
                sessionStorage.removeItem('project.id');
                const suggestTasks = getSuggestTasksHTML(
                    allTasks,
                    dueTasks,
                    projects
                );

                if (suggestTasks[0].childElementCount > 0) {
                    $('#task').append(suggestTasks);
                } else {
                    $('#task').append('You have no due tasks!');
                }
            }

            $('#spinner').hide();

            setEvents(dueTasks, allTasks);
        }
    }
    asyncCall();
});
