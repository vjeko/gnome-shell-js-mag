from pynput.keyboard import Listener  as KeyboardListener
from pynput.mouse    import Listener  as MouseListener
from pynput.keyboard import Key

import os

current = float(os.popen('dconf read /org/gnome/desktop/a11y/magnifier/mag-factor').read())
modifier = False

def on_scroll(x, y, dx, dy):
    global current
    global modifier

    if not modifier: return
    myCmd = 'dconf write /org/gnome/desktop/a11y/magnifier/mag-factor '
    if dy < 0: current -= 0.25
    else: current += 0.25

    if current < 1.0: current = 1.0
    os.system(myCmd + str(current))

def on_press(key):
    global modifier
    if key == Key.shift_l:
        modifier = True

def on_release(key):
    global modifier
    if key == Key.shift_l:
        modifier = False

with MouseListener(on_scroll=on_scroll) as listener:
    with KeyboardListener(on_press=on_press, on_release=on_release) as listener:
        listener.join()
        listener.start()
