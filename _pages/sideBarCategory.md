---
title: "posts"
permalink: /posts/category
layout: single
sidebar:
  - nav: "docs"
---
<div class="tags-expo">
  <div class="tags-expo-section">
    {% for category in site.categories %}
    <h2 id="{{ category[0] | slugify }}">{{ category | first }}</h2>
    <ul class="tags-expo-posts">
      {% for post in category[1] %}
        <a class="post-title" href="{{ site.baseurl }}{{ post.url }}" id="{{post.url}}">
      <li>
        {{ post.title }}
      <small class="post-date">{{ post.date | date_to_string }}</small>
      </li>
      </a>
      {% endfor %}
    </ul>
    {% endfor %}
  </div>
</div>

<script>
    document.getElementsByClassName('tags-expo-section')[0].addEventListener('click', (event)=>{
    alert(event.);
    event.preventDefault();
    });
</script>
