from django.core.management.commands.runserver import Command as RunserverCommand

# Change the default port to 5050
RunserverCommand.default_port = '5050'
