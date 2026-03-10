import sys
import subprocess
import shlex

def run_command(command_string):
    args = shlex.split(command_string)

    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        shell=False,
        check=True,
        cwd="backend/container"
    )
    
    if result.stdout:
        print(result.stdout, end="")

    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "code": result.returncode
    }


"""
This is for local testing without running UI
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
        
interactive_shell()