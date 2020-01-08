import { getAPI, getAuth, getURLParameter } from "./ist.fn.api.js";
import {
    getAllTasks,
    getDueTasks,
    getSuggestTasksHTML
} from "./ist.fn.list.js";
import { getHighestPriorityTask, getTaskHTML } from "./ist.fn.task.js";
import { setEvents } from "./ist.fn.event.js";

$(document).ready(function() {
    async function asyncCall() {
        if (Cookies.get("todoistToken") === undefined) {
            let authCode = getURLParameter("code");
            if (authCode) {
                let authState = getURLParameter("state");
                if (authState == "todoist") {
                    $("#task").append("logging into Todoist, please wait...");
                    let authRaw = await getAuth(authCode),
                        authToken = authRaw.access_token;
                    Cookies.set("todoistToken", authToken, { expires: 182 });
                    window.location.replace("/");
                }
            } else {
                $.get("README.md", function(readme) {
                    let converter = new showdown.Converter(),
                        readmeHTML = converter.makeHtml(readme);

                    $("#task").append(
                        readmeHTML,
                        '<a href="https://todoist.com/oauth/authorize?client_id=711cd8b82f8e433f83f4972c4cae127f&state=todoist&scope=data:read_write"><button>when ready, log in with Todoist</button></a>'
                    );
                });
                $("#spinner").hide();
                return false;
            }
        }

        let todoistRawTasks = await getAPI("tasks");

        // create master task objects
        let allTasks = getAllTasks(todoistRawTasks),
            dueTasks = getDueTasks(allTasks);

        if (allTasks == "overdue") {
            throw "overdue";
        }

        let projects = await getAPI("projects");

        let highestPriorityTask = getHighestPriorityTask(dueTasks, projects);

        if (highestPriorityTask) {
            let todoistRawComments = await getAPI(
                "comments?task_id=" + highestPriorityTask.id
            );
            let mainTask = getTaskHTML(
                highestPriorityTask,
                projects,
                todoistRawComments
            );
            $("#task").append(mainTask);
        } else {
            sessionStorage.removeItem("project.id");
            let suggestTasks = getSuggestTasksHTML(
                allTasks,
                dueTasks,
                projects
            );

            if (suggestTasks[0].childElementCount > 0) {
                $("#task").append(suggestTasks);
            } else {
                $("#task").append("You have no due tasks!");
            }
        }

        $("#spinner").hide();

        setEvents(dueTasks, allTasks);
    }
    asyncCall();
});
