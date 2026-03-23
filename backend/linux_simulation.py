import sys
import subprocess
import shlex

def run_command(command_string):
    args = shlex.split(command_string)

    result = subprocess.run(
        args,
        # capture_output=True,
        # text=True,
        shell=True
    )

    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "code": result.returncode
    }

"""

This is for local terminal testing it looks cool dont touch

"""
def interactive_shell():
    while True:
        try:
            command = input("user@lti-shell:~$ ")
            
            if command.lower() == 'exit':
                print("Exiting simulator.")
                break
            
            run_command(command)
            
        except KeyboardInterrupt:
            print("\nExiting simulator.")
            break

# interactive_shell()
