/* global sessionStorage, $, _, Cookies, showdown, moment, location */
import ENV from './env.js';
import { getAPI, syncAPI, getAuth, getURLParameter } from './ist.fn.api.js';
import {
    getAllTasks,
    getDueTasks,
    getSuggestTasksHTML
} from './ist.fn.list.js';
import { getHighestPriorityTask, getTaskHTML } from './ist.fn.task.js';
import { setEvents } from './ist.fn.event.js';
import { dynalistSetAuthEvents } from './ist.fn.dyn.js';

showdown.setOption('openLinksInNewWindow', 'true');
showdown.setOption('strikethrough', 'true');
showdown.setOption('tables', 'true');

$(function () {
    async function asyncCall() {
        const authCode = getURLParameter('code'),
            authState = getURLParameter('state');
        let autoMode = false;

        if (location.search === '?auto') {
            autoMode = true;
            $('body').addClass('automode');
        }

        if (Cookies.get('todoistToken') === undefined) {
            if (authCode && authState === 'todoist') {
                $('#task').append('logging into Todoist, please wait...');
                const authRaw = await getAuth(authCode),
                    authToken = authRaw.access_token;
                Cookies.set('todoistToken', authToken, {
                    expires: 182
                });
                window.location.replace('/ist/');
            } else {
                $.get('README.md', function (readme) {
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
            if (authCode && authState === 'dynalist' && Cookies.get('dynalistToken') === undefined) {
                $('#task').append('logging into Dynalist, please wait...');
                Cookies.set('dynalistToken', authCode, {
                    expires: 182
                });
                window.location.replace('/ist/');
            }

            $('.status').text('getting tasks...');
            const todoistRawTasks = await getAPI('tasks');

            const allTasks = getAllTasks(todoistRawTasks),
                dueTasks = getDueTasks(allTasks);

            if (allTasks === 'overdue') {
                $('.status').text('rescheduling overdue tasks...');
            } else {
                $('.status').text('getting projects...');
            }

            const projects = await getAPI('projects'),
                highestPriorityTask = getHighestPriorityTask(
                    dueTasks,
                    projects
                );

            if (highestPriorityTask) {
                $('.status').text('getting task comments...');
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

                $('.status').text('');
                dynalistSetAuthEvents();
            } else if (allTasks !== 'overdue') {
                sessionStorage.removeItem('project.id');

                $('.status').text('getting and building stats...');
                const { days_items: todoistRawActivity } = await syncAPI(
                    'completed/get_stats'
                );

                const todayActivity = _.find(todoistRawActivity, (dayStats) => {
                    return moment(dayStats.date).isSame(new Date(), 'day');
                });

                const activity = todayActivity ? todayActivity.items : [];

                $('.status').text('building project list...');
                const suggestTasks = getSuggestTasksHTML(
                    dueTasks,
                    projects,
                    activity,
                    autoMode
                );

                if (suggestTasks[0].childElementCount > 0) {
                    $('#task').append(suggestTasks);
                }
            }

            $('#spinner').hide();
            $('.status').text('');

            setEvents(dueTasks, allTasks);
        }
    }
    asyncCall();
});
