#version 300 es

uniform vec2 basePosition;
uniform vec2 quadScale;

out vec2 v_uv;

void main()
{
    int index = gl_VertexID;

    vec2 uv = vec2(0.0);
    if      (index == 0) uv = vec2(0.0, 0.0);
    else if (index == 1) uv = vec2(1.0, 0.0);
    else if (index == 2) uv = vec2(1.0, 1.0);
    else if (index == 3) uv = vec2(1.0, 1.0);
    else if (index == 4) uv = vec2(0.0, 1.0);
    else                 uv = vec2(0.0, 0.0);

    vec2 pos = basePosition + uv * quadScale;
    pos.y = 1.0 - pos.y;
    gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
    v_uv = uv;
}
