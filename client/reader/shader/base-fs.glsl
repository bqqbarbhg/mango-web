#version 300 es

precision highp float;
out vec4 outColor;

in vec2 v_uv;

uniform float fadeAmount;
uniform sampler2D mainTexture;

void main()
{
    float fade = fadeAmount;
    vec4 tint = vec4(fade, fade, fade, 1.0);
    vec4 tex = texture(mainTexture, v_uv, -0.1);
    outColor = tex.x * tint;
}
