#!/usr/bin/env python
"""
See LICENSES
"""
import os
import subprocess
import sys

ENV_INIT_DIRECTORY = os.environ.get('ENV_INIT_DIRECTORY', '/etc/my_init.d')

LOG_LEVEL_ERROR = 1
LOG_LEVEL_WARN = 1
LOG_LEVEL_INFO = 2
LOG_LEVEL_DEBUG = 3

log_level = LOG_LEVEL_INFO


def error(message):
    if log_level >= LOG_LEVEL_ERROR:
        sys.stderr.write(f"*** {message}\n")


def warn(message):
    if log_level >= LOG_LEVEL_WARN:
        sys.stderr.write(f"*** {message}\n")


def info(message):
    if log_level >= LOG_LEVEL_INFO:
        sys.stderr.write(f"*** {message}\n")


def listdir(path):
    try:
        result = os.path.isdir(path)
    except OSError:
        return []
    if result:
        return sorted(os.listdir(path))
    else:
        return []


def is_executable(path):
    try:
        return os.path.isfile(path) and os.access(path, os.X_OK)
    except OSError:
        return False


def run_command(filename):
    status = None
    try:
        status = subprocess.check_call(filename, shell=False)
    except subprocess.CalledProcessError as exc:
        status = exc.returncode
    if status != 0:
        if status is None:
            error(f"{filename} exited with unknown status\n")
        else:
            error(f"{filename} failed with status {status}\n")


def run_startup_files():
    for name in listdir(ENV_INIT_DIRECTORY):
        filename = os.path.join(ENV_INIT_DIRECTORY, name)
        if is_executable(filename):
            info(f"Running {filename}...")
            run_command(filename)


run_startup_files()
