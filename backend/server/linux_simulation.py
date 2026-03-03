import subprocess
import shlex
import sys

def run_command(command_string):
    if not command_string.strip():
        return

    try:
        args = shlex.split(command_string)
        
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            shell=False,
            check=True   
        )
        
        if result.stdout:
            print(result.stdout, end='')
            
    except FileNotFoundError:
        print(f"Error: Command not found or invalid: {command_string.split()[0]}")
    except subprocess.CalledProcessError as e:
        print(f"Error: Command '{e.cmd}' failed with return code {e.returncode}")
        if e.stderr:
            print(f"Stderr: {e.stderr}", end='')
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def interactive_shell():
    while True:
        try:
            command = input("$ ")
            
            if command.lower() == 'exit':
                print("Exiting simulator.")
                break
            
            run_command(command)
            
        except KeyboardInterrupt:
            print("\nExiting simulator.")
            break

if __name__ == "__main__":
    interactive_shell()
