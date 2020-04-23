---
title: post
permalink: /blog/post
layout: single
author_profile: true
---
<p>Posts in category "basic" are:</p>

<ul>
  {% for post in site.categories['post'] %}
    {% if post.url %}
        <li><a href="{{ post.url }}">{{ post.title }} /      <small class="post-date">{{ post.date | date_to_string }}</small>
</a></li>
    {% endif %}
  {% endfor %}
</ul>
