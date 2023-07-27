#version 300 es

precision highp float;
out vec4 outColor;

in vec2 v_uv;

uniform sampler2D mainTexture;

void main()
{
    outColor = texture(mainTexture, v_uv, -0.1);
}
