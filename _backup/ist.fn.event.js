import { postAPI } from "./ist.fn.api.js";
export { setEvents };

function uuidv4() {
    // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );
}

function setEvents(dueTasks, fullTasks) {
    $(".doneButton").click(function(event) {
        event.preventDefault();
        let taskID = Number($(this).attr("taskID")),
            randUUID = uuidv4(),
            commands = [
                {
                    type: "item_close",
                    uuid: randUUID,
                    args: { id: taskID }
                }
            ];

        asyncCall(commands);
    });

    $(".deferButton").click(function(event) {
        event.preventDefault();
        let taskID = Number($(this).attr("taskID")),
            task = _.findWhere(dueTasks, {
                id: taskID
            });

        let modal = new tingle.modal({
            footer: true,
            closeMethods: ["overlay", "escape"]
        });

        let deferArray =
            task.due.all_day == 0
                ? [
                      ["+5 minutes", 300000],
                      ["+15 minutes", 900000],
                      ["+30 minutes", 1800000],
                      ["+45 minutes", 2700000],
                      ["+1 hour", 3600000],
                      ["+2 hours", 7200000],
                      ["+3 hours", 10800000],
                      ["+4 hours", 14400000],
                      ["+6 hours", 21600000],
                      ["+12 hours", 43200000],
                      ["+24 hours", 86400000],
                      ["+48 hours", 172800000]
                  ]
                : [
                      ["+1 day", 86400000],
                      ["+2 days", 172800000],
                      ["+3 days", 259200000],
                      ["+4 days", 345600000],
                      ["+5 days", 432000000],
                      ["+6 days", 518400000],
                      ["+7 days", 604800000],
                      ["+8 days", 691200000],
                      ["+9 days", 777600000],
                      ["+10 days", 864000000],
                      ["+11 days", 950400000],
                      ["+12 days", 1036800000]
                  ];

        $.each(deferArray, function(n, deferAmount, deferAmountMS) {
            modal.addFooterBtn(
                deferAmount[0],
                "tingle-btn tingle-btn--primary",
                function() {
                    let nowMS = new Date().getTime(),
                        deferMS = 0,
                        offset = 0,
                        sliceNum = 19,
                        randUUID = uuidv4();

                    if (task.due.all_day == 0) {
                        // timed task
                        deferMS = nowMS + deferAmount[1];
                        offset = new Date().getTimezoneOffset() / 60;
                    } else {
                        // all-day task
                        deferMS = Number(task.due.all_day) + deferAmount[1];
                        sliceNum = 10;
                    }

                    let deferDate = new Date(deferMS);
                    deferDate.setHours(deferDate.getHours() - offset);
                    deferDate = deferDate.toISOString().slice(0, sliceNum);

                    let commands = [
                        {
                            type: "item_update",
                            uuid: randUUID,
                            args: {
                                id: taskID,
                                due: {
                                    date: deferDate,
                                    string: task.due.string
                                }
                            }
                        }
                    ];

                    asyncCall(commands);

                    modal.close();
                }
            );
        });
        modal.open();
    });

    $(".suggest").click(function() {
        let taskID = Number($(this).attr("taskID")),
            randUUID = uuidv4(),
            task = _.findWhere(fullTasks, {
                id: taskID
            }),
            nowTime = new Date(),
            offset = new Date().getTimezoneOffset() / 60;

        nowTime.setHours(nowTime.getHours() - offset);
        nowTime = nowTime.toISOString().slice(0, 19);

        let commands = [
            {
                type: "item_update",
                uuid: randUUID,
                args: {
                    id: taskID,
                    due: {
                        date: nowTime,
                        string: task.due.string
                    }
                }
            }
        ];
        asyncCall(commands);
    });
}

async function asyncCall(commands) {
    let result = await postAPI(JSON.stringify(commands));
    location.reload();
}
