/* global $, _, moment, location, sessionStorage */
import PRIORITIES from './priorities.js';
import { asyncCall, uuidv4, postNewTaskTime } from './ist.fn.api.js';
import { getTaskRepeatMoment } from './ist.fn.task.js';
export { setEvents, setFirstEvents, spinOut };

function setFirstEvents() {
    $('#cog-button').on('click auxclick', function () {
        $('#settings')[0].showModal();
        $('#settings').on('click', function (event) {
            if (event.target === this) {
                $(this)[0].close();
            }
        });

        $('#toggle-auto, #toggle-important').on('click', function () {
            const param = $(this).attr('id').replace('toggle-', '');
            const url = new URL(window.location.href);
            const searchParams = new URLSearchParams(url.search);

            if (searchParams.has(param)) {
                searchParams.delete(param);
            } else {
                searchParams.set(param, '');
            }

            url.search = searchParams.toString().replace(/=/g, '');
            window.location.href = url.toString();
        });
    });
}

function setEvents(dueTasks, allTasks) {
    $('.doneButton').on('click auxclick', function (event) {
        event.preventDefault();
        const taskID = $(this).attr('taskID'),
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

    $(document).on('keydown', function (event) {
        if (event.key === 'd') {
            $('.deferButton').click();
        }
    });

    $('.deferButton').on('click auxclick', function (event) {
        event.preventDefault();
        const taskID = $(this).attr('taskID'),
            task = _.findWhere(dueTasks, {
                id: taskID
            }),
            dialog = $('<dialog></dialog>').attr('id', 'deferModal'),
            taskNewMoment = getTaskRepeatMoment(task).add(1, 'days'),
            nowMoment = moment(),
            taskNewTime = taskNewMoment.format('LT').replace(':00', ''),
            taskUntilTomorrow = taskNewMoment.diff(nowMoment),
            deferArrayTimes = [
                [`tomorrow ${taskNewTime}`, taskUntilTomorrow],
                ['+1 minute &#127939;', 60000],
                ['+3 minutes', 180000],
                ['+10 minutes', 600000],
                ['+15 minutes', 900000],
                ['+30 minutes', 1800000],
                ['+45 minutes', 2700000],
                ['+1 hour', 3600000],
                ['+90 minutes', 5400000],
                ['+2 hrs', 7200000],
                ['+3 hrs', 10800000],
                ['+4 hrs', 14400000],
                ['+6 hrs', 21600000],
                ['+8 hrs', 28800000],
                ['+12 hrs', 43200000],
                ['+18 hrs', 64800000],
                ['+24 hrs', 86400000]
            ],
            deferArray =
                task.due.all_day === 0
                    ? deferArrayTimes
                    : getDeferArrayDays(allTasks, task),
            deferButtonClass =
                task.due.all_day === 0
                    ? ' deferModal-btn--column'
                    : ' deferModal-btn--row';

        $.each(deferArray, (i, deferAmount) => {
            const newTime = moment().add(deferAmount[1], 'ms');
            let buttonContent = `${deferAmount[0]}`;

            if (task.due.all_day === 0 && deferAmount[1] >= 1800000 && i > 0) {
                buttonContent += `<small>${newTime.format('h:mm A')}</small>`;
            }

            const btn = document.createElement('button');
            btn.className = `deferModal-btn deferModal-btn--primary${deferButtonClass}`;
            btn.innerHTML = buttonContent;
            btn.addEventListener('click', () => {
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

                dialog[0].remove();
            });

            dialog[0].appendChild(btn);
        });

        document.body.appendChild(dialog[0]);
        dialog[0].showModal();

        dialog[0].addEventListener('click', (e) => {
            if (e.target === dialog[0]) {
                dialog[0].remove();
            }
        });
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
    $('#spinner, #task').toggle();
    location.reload();
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
            tasksPriorityCountString += `<span ${key !== priority ? " class='dim'" : ''
                }><span style='color: ${PRIORITIES[key]}'>&#x${2775 + key}</span> ${tasksPriorityCount[key] || 0
                }</span> &nbsp;&nbsp;`;
        }
    );

    return tasksPriorityCountString;
}
