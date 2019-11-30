import { asyncCall, uuidv4, postNewTaskTime } from "./ist.fn.api.js";
export { setEvents };

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

        $.each(deferArray, function(n, deferAmount) {
            modal.addFooterBtn(
                deferAmount[0],
                "tingle-btn tingle-btn--primary",
                function() {
                    let newTime = moment().add(deferAmount[1], "ms"),
                        taskNewDate = "";

                    if (task.due.all_day != 0) {
                        taskNewDate = newTime.format("YYYY-MM-DD");
                    } else {
                        taskNewDate = newTime.format("YYYY-MM-DDTHH:mm:ss");
                    }
                    postNewTaskTime(task.id, task.due.string, taskNewDate);

                    modal.close();
                }
            );
        });
        modal.open();
    });

    $(".suggest").click(function() {
        sessionStorage.setItem("project.id", $(this).attr("project.id"));
        location.reload();
    });

    $("#backToProjects").click(function() {
        sessionStorage.removeItem("project.id");
        location.reload();
    });
}
