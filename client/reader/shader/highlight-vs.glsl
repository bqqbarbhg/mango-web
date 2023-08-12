#version 300 es

uniform vec2 basePosition;
uniform vec2 baseScale;

layout(location=0) in vec2 i_uv;

void main()
{
    vec2 uv = i_uv;
    vec2 pos = basePosition + uv * baseScale;
    pos.y = 1.0 - pos.y;
    gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
