import * as vscode from 'vscode';
import * as util from 'util';

const exec = util.promisify(require('child_process').exec);

interface ProcessItem extends vscode.QuickPickItem {
    pid: number;
}

export async function pickProcess(): Promise<string | undefined> {
    const processToReturn = await chooseProcess();
    const pid = processToReturn?.pid.toString();
    const label = processToReturn?.label;
    // returning this as a string because pickProcess must only return a string because of how package.json is set up
    const toReturn = `${pid}:${label}`;
    return toReturn;
}

export async function chooseProcess(): Promise<ProcessItem | undefined> {
    const items = await getAttachItems();

    const chosenProcess: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true
    };

    const process = await vscode.window.showQuickPick(items, chosenProcess);

    if (process === undefined) {
        throw new Error('Process not selected');
    } else {
        return process;
    }
}

export async function getAttachItems(): Promise<ProcessItem[]> {
    const usernameCharacters = 20;
    const commandCharacters = 50;
    /**
     * We use the command 'ps -ax -o pid,uname:${usernameCharacters},comm:${commandCharacters},args' to
     * list the all processes with necessary information for the debugger to pick from and attach to.
     * 
     * Sample output:
     *    PID USER                 COMMAND                                            COMMAND
     *      1 root                 systemd                                            /sbin/init
     *      2 root                 init-systemd(Ub                                    /init
     *     10 root                 init                                               plan9 --control-socket 6 --log-level 4 --server-fd 7 --pipe-fd 9 --log-truncate
     *     51 root                 systemd-journal                                    /lib/systemd/systemd-journald
     *     82 root                 systemd-udevd                                      /lib/systemd/systemd-udevd
     *    110 root                 snapfuse                                           snapfuse /var/lib/snapd/snaps/bare_5.snap /snap/bare/5 -o ro,nodev,allow_other,suid
     */

    const { error, stdout, stderr } = await exec(`ps -ax -o pid,uname:${usernameCharacters},comm:${commandCharacters},args`);
    const options = stdout;

    if (error || stderr) {
        if (stderr && stderr.includes('screen size is bogus')) {
            // ignore this error silently;
            // see https://github.com/microsoft/vscode/issues/75932
        } else {
            throw new Error(`Unable to select process to attach to: ${stderr}`);
        }
    }

    const output = options.split('\n');
    
    /**
     * The following lines of code till the end of this function reference the code handling 
     * the process picking functionality in the Debugger section of the vscode-cpptools extension:
     * https://github.com/microsoft/vscode-cpptools/blob/main/Extension/src/Debugger/nativeAttach.ts
     */
    const quickPickList: ProcessItem[] = [];
    
    // lines[0] is the header of the output table
    for (let i = 1; i < output.length; i += 1) {
        const line: string = output[i];
        if (line) {
            const processEntry: ProcessItem | undefined = parseLineFromPs(line, usernameCharacters, commandCharacters);
            if (processEntry) {
                quickPickList.push(processEntry);
            }
        }
    }

    return quickPickList;
}

/**
 * This function are a copy of the code handling the process picking 
 * functionality in the Debugger section of the vscode-cpptools extension:
 * https://github.com/microsoft/vscode-cpptools/blob/main/Extension/src/Debugger/nativeAttach.ts
 */
export function parseLineFromPs(line: string, usernameCharacters: number, commandCharacters: number): ProcessItem | undefined {
    // Explanation of the regex:
    //   - any leading whitespace
    //   - PID
    //   - whitespace
    //   - executable name --> this is commandCharacters - 1 because ps reserves one character
    //     for the whitespace separator
    //   - whitespace
    //   - args (might be empty)
    const noValidProcess = undefined;
    const psEntry = new RegExp(`^\\s*([0-9]+)\\s+(.{${usernameCharacters - 1}})\\s+(.{${commandCharacters - 1}})\\s+(.*)$`);
    const matches: RegExpExecArray | null = psEntry.exec(line);
    if (matches && matches.length === 5) {
        const pid: string = matches[1].trim();
        const username: string = matches[2].trim();
        const executable: string = matches[3].trim();
        const cmdline: string = matches[4].trim();
        const processItem: ProcessItem = { 
            pid: Number(pid), 
            label: `${username}:${executable}`, 
            description: `${pid}`,
            detail: cmdline 
        };
        return processItem;
    }
    return noValidProcess;
}
