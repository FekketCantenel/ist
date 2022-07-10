/* global $, _, tingle, moment, location, sessionStorage */
import PRIORITIES from './priorities.js';
import { asyncCall, uuidv4, postNewTaskTime } from './ist.fn.api.js';
import { getTaskRepeatMoment } from './ist.fn.task.js';
export { setEvents, spinOut, vibrate };

function setEvents(dueTasks, allTasks) {
    $('.doneButton').on('click auxclick', function (event) {
        event.preventDefault();
        const taskID = Number($(this).attr('taskID')),
            randUUID = uuidv4(),
            commands = [
                {
                    type: 'item_close',
                    uuid: randUUID,
                    args: { id: taskID }
                }
            ];

        asyncCall(commands);
    });

    $('.deferButton').on('click auxclick', function (event) {
        vibrate();
        event.preventDefault();
        const taskID = Number($(this).attr('taskID')),
            task = _.findWhere(dueTasks, {
                id: taskID
            }),
            modal = new tingle.modal({
                footer: true,
                closeMethods: ['overlay', 'escape']
            }),
            taskNewMoment = getTaskRepeatMoment(task).add(1, 'days'),
            nowMoment = moment(),
            taskNewTime = taskNewMoment.format('LT').replace(':00', ''),
            taskUntilTomorrow = taskNewMoment.diff(nowMoment),
            deferArrayTimes = [
                [`tomorrow ${taskNewTime}`, taskUntilTomorrow],
                ['+15 minutes', 900000],
                ['+30 minutes', 1800000],
                ['+45 minutes', 2700000],
                ['+1 hour', 3600000],
                ['+90 minutes', 5400000],
                ['+2 hours', 7200000],
                ['+3 hours', 10800000],
                ['+4 hours', 14400000],
                ['+6 hours', 21600000],
                ['+8 hours', 28800000],
                ['+12 hours', 43200000],
                ['+18 hours', 64800000],
                ['+24 hours', 86400000],
                ['+1 minute &#127939;', 60000]
            ],
            deferArray =
                task.due.all_day === 0
                    ? deferArrayTimes
                    : getDeferArrayDays(allTasks, task);

        $.each(deferArray, (i, deferAmount) => {
            modal.addFooterBtn(
                deferAmount[0],
                `tingle-btn tingle-btn--primary ${
                    task.due.all_day === 0 ? 'tingle-btn--column' : ''
                }`,
                () => {
                    vibrate();

                    const newTime = moment().add(deferAmount[1], 'ms');
                    let taskNewDate = '';

                    taskNewDate = newTime.format(
                        task.due.all_day === 0
                            ? 'YYYY-MM-DDTHH:mm:ss'
                            : 'YYYY-MM-DD'
                    );

                    const taskToDefer = [
                        {
                            id: task.id,
                            string: task.due.string,
                            date: taskNewDate
                        }
                    ];

                    postNewTaskTime(taskToDefer);

                    modal.close();
                }
            );
        });
        modal.open();
    });

    $('.suggest').on('click auxclick', function () {
        sessionStorage.setItem('project.id', $(this).attr('projectid'));
        spinOut();
    });

    $('#backToProjects').on('click auxclick', function () {
        sessionStorage.removeItem('project.id');
        spinOut();
    });
}

function spinOut() {
    vibrate();
    $('#spinner, #task').toggle();
    location.reload();
}

function vibrate() {
    if ('vibrate' in navigator) {
        navigator.vibrate(75);
    }
}

function getDeferArrayDays(allTasks, task) {
    const dateTasks = _.groupBy(
            _.filter(allTasks, (thisTask) => {
                return thisTask.project_id === task.project_id;
            }),
            (thisTask) => {
                return thisTask.due.date;
            }
        ),
        deferArrayDays = [];

    _.each(
        Array.from(Array(12)).map((e, i) => i + 1),
        (key) => {
            const dateMoment = moment().add(key, 'days'),
                tasksPriorityCount = _.countBy(
                    dateTasks[dateMoment.format('YYYY-MM-DD')],
                    (thisTask) => {
                        return thisTask.priority;
                    }
                );

            deferArrayDays.push([
                `+${key} day${key > 1 ? 's' : ''} (${dateMoment.format(
                    'ddd MMM D'
                )})<br />${tasksPriorityCountHTML(
                    tasksPriorityCount,
                    task.priority
                )}`,
                Number(86400000 * key)
            ]);
        }
    );

    return deferArrayDays;
}

function tasksPriorityCountHTML(tasksPriorityCount, priority) {
    let tasksPriorityCountString = '';

    _.each(
        Array.from(Array(4))
            .map((e, i) => i + 1)
            .reverse(),
        (key) => {
            tasksPriorityCountString += `<span ${
                key !== priority ? " class='dim'" : ''
            }><span style='color: ${PRIORITIES[key]}'>&#x${2775 + key}</span> ${
                tasksPriorityCount[key] || 0
            }</span> &nbsp;&nbsp;`;
        }
    );

    return tasksPriorityCountString;
}
