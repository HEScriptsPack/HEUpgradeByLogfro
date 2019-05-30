// ==UserScript==
// @name         HEUpgrade Rework
// @namespace    https://logfro.de/
// @version      0.1
// @description  Upgrading all things which are added to the Que
// @author       You
// @match        https://legacy.hackerexperience.com/hardware*
// @updateURL    https://gitcdn.xyz/repo/Logfro/HEUpgrade/master/HEUpgrade.meta.js
// @downloadURL  https://gitcdn.xyz/repo/Logfro/HEUpgrade/master/HEUpgrade.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    //Stolen from BetterHEx
    String.prototype.replaceAll = function (search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    //Stolen from BetterHEx
    function addNavButton(name, id) {
        let li = document.createElement("li");
        let a = document.createElement("a");
        let span = document.createElement("span");
        let text = document.createTextNode(name);
        span.className = "hide-phone";
        a.id = id;
        li.appendChild(a);
        a.appendChild(span);
        span.appendChild(text);
        li.className = "link";
        document.getElementsByClassName("nav nav-tabs")[0].appendChild(li);
    }

    function addHardBox(intialValue, id, name) {
        let li = document.createElement("li");
        let divRight = document.createElement("div");
        let divLeft = document.createElement("div");
        let text = document.createElement("strong");
        divRight.setAttribute("class", "right");
        divLeft.setAttribute("class", "left");
        let img = document.createElement("img");
        img.setAttribute("src", "https://logfro.de/img/HWK-Logo.png");
        img.setAttribute("style", "width: 50px; heigth: auto");
        divLeft.appendChild(img);
        text.id = id;
        text.innerText = intialValue;
        text.setAttribute("style", "font-size: 15px;");
        divRight.appendChild(text);
        divRight.appendChild(document.createTextNode(name));
        li.appendChild(divLeft);
        li.appendChild(divRight);
        document.getElementsByClassName("hard-box")[0].appendChild(li);
    }

    function countHardwareValues() {
        let returnObj = {
            cpus: 0,
            cpusMaxed: 0,
            hdds: 0,
            hddsMaxed: 0,
            rams: 0,
            ramsMaxed: 0
        };
        let servers = document.getElementsByClassName("list-user");
        for (let i = 0; i < servers.length; i++) {
            let server = servers[i];
            let ghz = server.children[1];
            let hdd = server.children[3];
            let ram = server.children[5];
            returnObj.cpus++;
            returnObj.hdds++;
            returnObj.rams++;
            if (ghz.innerText.split(" ")[0] === "4") {
                returnObj.cpusMaxed++;
            }
            if (hdd.innerText.split(" ")[0] === "10") {
                returnObj.hddsMaxed++;
            }
            if (ram.innerText.split(" ")[0] === "2048") {
                returnObj.ramsMaxed++;
            }
        }
        return returnObj;
    }

    function getBankAccounts() {
        return new Promise(function (resolve) {
            let bankAccountsObj = [];
            fetch(document.location.origin + "/ajax.php",
                {
                    method: "POST",
                    body: "func=getBankAccs",
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-with': 'XMLHttpRequest'
                    },
                    redirect: 'follow'
                }).then(function (response) {
                response.json().then(function (retValue) {
                    let data = retValue;
                    let dummyElm = document.createElement("div");
                    dummyElm.innerHTML = retValue.msg;
                    let bankAccounts = dummyElm.children[0].children;
                    for (let i = 0; i < bankAccounts.length; i++) {
                        let account = bankAccounts[i];
                        let balance = account.innerText.substring(account.innerText.indexOf("(") + 2, account.innerText.indexOf(")")).replaceAll(",", "");
                        let obj = {number: account.value, balance: parseInt(balance)};
                        bankAccountsObj.push(obj);
                        resolve(bankAccountsObj);
                    }
                });
            });
        });
    }

    function addUpgradeToQue(link, type) {
        let que;
        if (localStorage.getItem("que") === null) {
            localStorage.setItem("que", JSON.stringify([]));
            que = [];
        } else {
            que = JSON.parse(localStorage.getItem("que"));
        }
        let obj = {link: document.location.origin + "/hardware" + link};
        let part_id, price;
        switch (type) {
            case "cpu":
                part_id = 8;
                price = 5000;
                break;
            case "hdd":
                part_id = 6;
                price = 8000;
                break;
            case "ram":
                part_id = 4;
                price = 2500;
                break;
        }
        obj.data = {acc: localStorage.getItem("curBank"), act: type, "part-id": part_id, price: price};
        que.push(obj);
        localStorage.setItem("que", JSON.stringify(que));
    }

    function processQue(queElm) {
        return new Promise(function (resolve, reject) {
            $.ajax(queElm.link, {
                type: 'POST',
                async: true,
                data: queElm.data,
                success: function (response) {
                    resolve(true);
                },
                error: function (error) {
                    return reject(false);
                }
            });
        });
    }

    let alerted = false;

    function queWorker(elm = false) {
        console.log("Started Worker!");
        let que = JSON.parse(localStorage.getItem("que"));
        let queElm = "";
        if (localStorage.getItem("queElm") !== "")
            queElm = JSON.parse(localStorage.getItem("queElm"));
        if (que.length === 0 && !elm && queElm === "") {
            setTimeout(function () {
                console.log("Restarted worker");
                if(!alerted)
                    alert("Im done here, waiting for more things added to que");
                alerted = true;
                queWorker();
            }, 1000);
        } else {
            if (!elm && queElm === "") {
                queElm = que.shift();
                localStorage.setItem("que", JSON.stringify(que));
                localStorage.setItem("queElm", JSON.stringify(queElm));
            } else {
                queElm = JSON.parse(localStorage.getItem("queElm"));
                localStorage.setItem("queElm", "");
            }
            processQue(queElm).then(function (success) {
                document.location = queElm.link;
                localStorage.setItem("cachedElm", "false");
            }).catch(function (error) {
                localStorage.setItem("cachedElm", "true");
                document.location = queElm.link;
            });
        }
    }

    if (document.location.href === "https://legacy.hackerexperience.com/hardware" || document.location.href === "https://legacy.hackerexperience.com/hardware#") {
        let started = false;
        addNavButton("Upgrade CPU", "upgradeCPU");
        addNavButton("Upgrade HDD", "upgradeHDD");
        addNavButton("Upgrade RAM (pls dont)", "upgradeRAM");
        let values = countHardwareValues();
        addHardBox(values.cpusMaxed + " / " + values.cpus, "cpuVal", "CPUs");
        addHardBox(values.hddsMaxed + " / " + values.hdds, "hddVal", "HDDs");
        addHardBox(values.ramsMaxed + " / " + values.rams, "ramVal", "RAMs");
        getBankAccounts().then(function (data) {
            let currentMax = 0;
            let finalAccount = "";
            for (let i = 0; i < data.length; i++) {
                if (currentMax < data[i].balance) {
                    currentMax = data[i].balance;
                    finalAccount = data[i].number;
                }
            }
            localStorage.setItem("curBank", finalAccount);
            addHardBox("Bank: #" + finalAccount, "bankVal", "Balance: $" + numberWithCommas(currentMax));
        });

        document.getElementById("upgradeCPU").addEventListener("click", function (elm) {
            //CPU Upgrade listener
            let servers = document.getElementsByClassName("list-user");
            for (let i = 0; i < servers.length; i++) {
                let server = servers[i];
                let link = server.parentElement.parentElement.parentElement.getAttribute("href");
                let ghz = server.children[1];
                if (ghz.innerText.split(" ")[0] !== "4") {
                    addUpgradeToQue(link, "cpu");
                }
            }
            if (!started)
                queWorker();
            started = true;
        });

        document.getElementById("upgradeHDD").addEventListener("click", function (elm) {
            //HDD Upgrade listener
            let servers = document.getElementsByClassName("list-user");
            for (let i = 0; i < servers.length; i++) {
                let server = servers[i];
                let link = server.parentElement.parentElement.parentElement.getAttribute("href");
                let hdd = server.children[3];
                if (hdd.innerText.split(" ")[0] !== "10") {
                    addUpgradeToQue(link, "hdd");
                }
            }
            if (!started)
                queWorker();
            started = true;
        });

        document.getElementById("upgradeRAM").addEventListener("click", function (elm) {
            //RAM Upgrade listener
            let servers = document.getElementsByClassName("list-user");
            for (let i = 0; i < servers.length; i++) {
                let server = servers[i];
                let link = server.parentElement.parentElement.parentElement.getAttribute("href");
                let ram = server.children[5];
                if (ram.innerText.split(" ")[0] !== "2048") {
                    addUpgradeToQue(link, "ram");
                }
            }
            if (!started)
                queWorker();
            started = true;
        });
    } else {
        if (localStorage.getItem("cachedElm") === "true")
            queWorker(true);
        else
            queWorker();
    }
})();